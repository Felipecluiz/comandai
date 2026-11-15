#!/usr/bin/env node
/**
 * pnpm setup:deploy — configura, UMA vez, tudo que o deploy automático precisa.
 *
 *  1. Confere gh/git, cria o repositório no GitHub se ainda não existir
 *  2. Coloca o workflow em .github/workflows e gera o pnpm-lock.yaml
 *  3. Cria (ou reaproveita) D1, namespace KV e projeto Pages via API da Cloudflare
 *  4. Descobre as URLs públicas da API (workers.dev) e do front (pages.dev)
 *  5. Cria o environment "production" no GitHub com secrets e variables
 *  6. Opcional: commit + push para disparar o primeiro deploy
 *
 * Idempotente: rodar de novo só confere o que já existe.
 * Flags: --dry-run (só mostra o que faria) · --yes (aceita tudo) · --rotate-secrets
 * Variáveis opcionais: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { argv, cwd, env, exit, platform, stdin, stdout, versions } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------- configuração do projeto
const PROJECT = {
  name: "Comandaí",
  worker: "comandai-api",
  d1: "comandai-db",
  kv: "comandai-images", // namespace KV das fotos (null quando o projeto não usa KV)
  pages: "comandai",
  generatedSecrets: ["JWT_SECRET"], // gerados automaticamente (48 bytes aleatórios)
  devVars: { example: "apps/api/.dev.vars.example", target: "apps/api/.dev.vars" },
};

const TOKEN_PERMISSIONS = [
  "Account · Workers Scripts · Edit",
  "Account · D1 · Edit",
  ...(PROJECT.kv ? ["Account · Workers KV Storage · Edit"] : []),
  "Account · Cloudflare Pages · Edit",
  "Account · Account Settings · Read",
];

const CF_API = env.CF_API_BASE ?? "https://api.cloudflare.com/client/v4";
const GH = env.GH_BIN ?? "gh";
const DRY_RUN = argv.includes("--dry-run");
const ASSUME_YES = argv.includes("--yes");
const ROTATE = argv.includes("--rotate-secrets");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------- saída no terminal
const color = (code) => (text) => (stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = color("1");
const green = color("32");
const yellow = color("33");
const red = color("31");
const dim = color("2");

const step = (title) => console.log(`\n${bold("▸ " + title)}`);
const ok = (msg) => console.log(`  ${green("✔")} ${msg}`);
/** Confirma uma mudança real; no dry-run a linha "○" já descreveu o que aconteceria. */
const applied = (msg) => (DRY_RUN ? undefined : ok(msg));
const info = (msg) => console.log(`  ${dim("·")} ${msg}`);
const warn = (msg) => console.log(`  ${yellow("!")} ${msg}`);
const planned = (msg) => console.log(`  ${yellow("○")} ${dim("[dry-run]")} ${msg}`);

class SetupError extends Error {}
const fail = (msg) => {
  throw new SetupError(msg);
};

// ---------------------------------------------------------------- prompts
async function confirm(question, defaultYes = true) {
  if (ASSUME_YES) return true;
  if (!stdin.isTTY) return defaultYes;
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`  ${question} ${dim(defaultYes ? "(S/n)" : "(s/N)")} `)).trim().toLowerCase();
  rl.close();
  return answer === "" ? defaultYes : ["s", "sim", "y", "yes"].includes(answer);
}

async function ask(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`  ${question} `);
  rl.close();
  return answer.trim();
}

/** Lê um segredo sem ecoar no terminal. */
function askHidden(question) {
  return new Promise((resolvePromise) => {
    stdout.write(`  ${question} `);
    if (!stdin.isTTY) {
      let data = "";
      stdin.setEncoding("utf8");
      stdin.on("data", (chunk) => (data += chunk));
      stdin.on("end", () => resolvePromise(data.trim()));
      return;
    }
    let value = "";
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolvePromise(value.trim());
        }
        if (char === "\u0003") exit(130); // Ctrl+C
        value = char === "\u007f" || char === "\b" ? value.slice(0, -1) : value + char;
      }
    };
    stdin.on("data", onData);
  });
}

// ---------------------------------------------------------------- processos (gh, git, pnpm)
function run(cmd, args, { input, allowFailure = false, mutates = false } = {}) {
  if (mutates && DRY_RUN) {
    planned(`${cmd} ${args.join(" ")}`);
    return "";
  }
  const result = spawnSync(cmd, args, { cwd: ROOT, input, encoding: "utf8", shell: platform === "win32" });
  if (result.error && result.error.code === "ENOENT") fail(`"${cmd}" não encontrado no PATH.`);
  if (result.status !== 0 && !allowFailure) {
    fail(`${cmd} ${args.join(" ")} falhou:\n${(result.stderr || result.stdout).trim()}`);
  }
  return result.status === 0 ? result.stdout.trim() : null;
}

const gh = (args, opts) => run(GH, args, opts);
const git = (args, opts) => run("git", args, opts);

// ---------------------------------------------------------------- API da Cloudflare
let cfToken = "";

async function cf(path, { method = "GET", body, allow404 = false } = {}) {
  if (method !== "GET" && DRY_RUN) {
    planned(`${method} ${path} ${body ? JSON.stringify(body) : ""}`);
    return null;
  }
  const response = await fetch(`${CF_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${cfToken}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allow404 && response.status === 404) return null;
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) {
    const errors = (json.errors ?? []).map((e) => `${e.code}: ${e.message}`).join("; ");
    const error = new SetupError(`Cloudflare ${method} ${path} → ${response.status} ${errors}`);
    error.codes = (json.errors ?? []).map((e) => e.code);
    throw error;
  }
  return json.result;
}

// ---------------------------------------------------------------- etapas
async function checkPrerequisites() {
  step("Pré-requisitos");
  const [major] = versions.node.split(".").map(Number);
  if (major < 20) fail(`Node 20+ necessário (atual: ${versions.node}).`);
  ok(`Node ${versions.node}`);

  gh(["--version"]);
  if (gh(["auth", "status"], { allowFailure: true }) === null) {
    fail(`GitHub CLI sem login. Rode: ${bold("gh auth login")}`);
  }
  ok("GitHub CLI autenticado");

  if (git(["rev-parse", "--is-inside-work-tree"], { allowFailure: true }) !== "true") {
    if (!(await confirm("Pasta ainda não é um repositório git. Inicializar com branch main?"))) fail("Abortado.");
    git(["init", "-b", "main"], { mutates: true });
  }
  ok("Repositório git");
}

async function ensureGitHubRepo() {
  step("Repositório no GitHub");
  const existing = gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { allowFailure: true });
  if (existing) {
    ok(existing);
    return existing;
  }
  const name = basename(ROOT);
  const login = gh(["api", "user", "-q", ".login"]);
  if (!(await confirm(`Criar o repositório público ${bold(`${login}/${name}`)}?`))) {
    fail("Crie o repositório (ou adicione o remote origin) e rode de novo.");
  }
  gh(["repo", "create", name, "--public", "--source", ".", "--remote", "origin"], { mutates: true });
  applied(`Criado ${login}/${name}`);
  return `${login}/${name}`;
}

function ensureWorkflowAndLockfile() {
  step("Arquivos do repositório");
  const workflow = join(ROOT, ".github/workflows/ci.yml");
  const parked = join(ROOT, "docs/ci.yml");
  // docs/ci.yml é uma versão "estacionada" do workflow (ex.: atualização vinda de fora): ela tem prioridade.
  if (existsSync(parked)) {
    const replacing = existsSync(workflow);
    if (DRY_RUN) planned(`${replacing ? "atualizar" : "mover"} docs/ci.yml → .github/workflows/ci.yml`);
    else {
      mkdirSync(dirname(workflow), { recursive: true });
      renameSync(parked, workflow);
      ok(`${replacing ? "Atualizado" : "Movido"} docs/ci.yml → .github/workflows/ci.yml`);
    }
  } else if (existsSync(workflow)) {
    ok(".github/workflows/ci.yml");
  } else {
    fail("Workflow não encontrado (nem .github/workflows/ci.yml nem docs/ci.yml).");
  }

  if (existsSync(join(ROOT, "pnpm-lock.yaml"))) ok("pnpm-lock.yaml");
  else {
    info("Gerando pnpm-lock.yaml (o CI usa --frozen-lockfile)…");
    run("pnpm", ["install"], { mutates: true });
    applied("pnpm-lock.yaml gerado");
  }

  const { example, target } = PROJECT.devVars ?? {};
  if (example && existsSync(join(ROOT, example)) && !existsSync(join(ROOT, target))) {
    const local = readFileSync(join(ROOT, example), "utf8").replace(
      /^(JWT_SECRET=).*$/m,
      `$1${randomBytes(48).toString("base64")}`,
    );
    if (DRY_RUN) planned(`criar ${target}`);
    else {
      writeFileSync(join(ROOT, target), local);
      ok(`${target} criado para dev local (segredo diferente do de produção)`);
    }
  }
}

async function readCloudflareToken() {
  step("Token da Cloudflare");
  cfToken = env.CLOUDFLARE_API_TOKEN ?? "";
  if (!cfToken) {
    console.log(`  Crie um token em ${bold("https://dash.cloudflare.com/profile/api-tokens")}`);
    console.log(`  → ${bold("Create Token")} → ${bold("Custom token")}, com as permissões:`);
    TOKEN_PERMISSIONS.forEach((p) => console.log(`      ${p}`));
    cfToken = await askHidden("Cole o token (não aparece na tela):");
  }
  if (!cfToken) fail("Token vazio.");
  const verified = await cf("/user/tokens/verify").catch(() => null);
  if (verified?.status !== "active") fail("Token inválido ou inativo.");
  ok("Token válido");
  return cfToken;
}

async function selectAccount() {
  step("Conta Cloudflare");
  const accounts = await cf("/accounts?per_page=50");
  if (!accounts?.length) fail('Nenhuma conta visível. O token precisa de "Account Settings · Read".');

  let account = env.CLOUDFLARE_ACCOUNT_ID
    ? accounts.find((a) => a.id === env.CLOUDFLARE_ACCOUNT_ID)
    : accounts.length === 1
      ? accounts[0]
      : null;

  if (!account) {
    accounts.forEach((a, i) => console.log(`    ${i + 1}) ${a.name} ${dim(a.id)}`));
    const choice = Number(await ask(`Qual conta usar? (1-${accounts.length})`));
    account = accounts[choice - 1] ?? fail("Opção inválida.");
  }
  ok(`${account.name} ${dim(account.id)}`);
  return account.id;
}

async function ensureD1(accountId) {
  const list = await cf(`/accounts/${accountId}/d1/database?name=${encodeURIComponent(PROJECT.d1)}`);
  const found = list?.find((db) => db.name === PROJECT.d1);
  if (found) {
    ok(`D1 ${PROJECT.d1} ${dim(found.uuid)} (já existia)`);
    return found.uuid;
  }
  const created = await cf(`/accounts/${accountId}/d1/database`, { method: "POST", body: { name: PROJECT.d1 } });
  const id = created?.uuid ?? "<novo>";
  applied(`D1 ${PROJECT.d1} criado ${dim(id)}`);
  return id;
}

async function ensureKv(accountId) {
  if (!PROJECT.kv) return null;
  const namespaces = await cf(`/accounts/${accountId}/storage/kv/namespaces?per_page=100`).catch((e) => {
    if (e.codes?.includes(10000)) {
      fail('O token não tem a permissão "Workers KV Storage · Edit". Edite o token na Cloudflare e rode de novo.');
    }
    throw e;
  });
  const found = namespaces?.find((ns) => ns.title === PROJECT.kv);
  if (found) {
    ok(`KV ${PROJECT.kv} ${dim(found.id)} (já existia)`);
    return found.id;
  }
  const created = await cf(`/accounts/${accountId}/storage/kv/namespaces`, {
    method: "POST",
    body: { title: PROJECT.kv },
  });
  const id = created?.id ?? "<novo>";
  applied(`KV ${PROJECT.kv} criado ${dim(id)}`);
  return id;
}

async function ensurePages(accountId) {
  let project = await cf(`/accounts/${accountId}/pages/projects/${PROJECT.pages}`, { allow404: true }).catch((e) => {
    if (e.codes?.includes(8000007)) return null; // projeto não existe
    throw e;
  });
  if (project) ok(`Pages ${PROJECT.pages} (já existia)`);
  else {
    project = await cf(`/accounts/${accountId}/pages/projects`, {
      method: "POST",
      body: { name: PROJECT.pages, production_branch: "main" },
    });
    applied(`Pages ${PROJECT.pages} criado`);
  }
  // Se o nome estiver ocupado globalmente, a Cloudflare atribui um subdomínio com sufixo.
  return `https://${project?.subdomain ?? `${PROJECT.pages}.pages.dev`}`;
}

async function resolveApiUrl(accountId) {
  const sub = await cf(`/accounts/${accountId}/workers/subdomain`).catch(() => null);
  if (!sub?.subdomain) {
    fail(
      'A conta ainda não tem subdomínio "workers.dev". Abra Cloudflare → Workers & Pages uma vez ' +
        "(ele é criado na primeira visita) e rode de novo.",
    );
  }
  return `https://${PROJECT.worker}.${sub.subdomain}.workers.dev`;
}

async function provisionCloudflare() {
  await readCloudflareToken();
  const accountId = await selectAccount();
  step("Recursos na Cloudflare");
  const d1Id = await ensureD1(accountId);
  const kvId = await ensureKv(accountId);
  const webUrl = await ensurePages(accountId);
  const apiUrl = await resolveApiUrl(accountId);
  ok(`API → ${apiUrl}`);
  ok(`Web → ${webUrl}`);
  return { accountId, d1Id, kvId, apiUrl, webUrl };
}

function ensureEnvironment(repo) {
  const created = gh(
    ["api", "--method", "PUT", `repos/${repo}/environments/production`, "--input", "-"],
    {
      mutates: true,
      allowFailure: true,
      input: JSON.stringify({ deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } }),
    },
  );
  if (created === null) {
    warn('Não foi possível criar o environment "production" (repositório privado no plano Free?).');
    warn("Os secrets/variables serão criados no nível do repositório.");
    return false;
  }
  const policies = DRY_RUN
    ? ""
    : gh(["api", `repos/${repo}/environments/production/deployment-branch-policies`, "-q", ".branch_policies[].name"]);
  if (!policies.split("\n").includes("main")) {
    gh(["api", "--method", "POST", `repos/${repo}/environments/production/deployment-branch-policies`, "--input", "-"], {
      mutates: true,
      input: JSON.stringify({ name: "main", type: "branch" }),
    });
  }
  applied('Environment "production" (deploy só a partir da main)');
  return true;
}

function configureGitHub(repo, { accountId, d1Id, kvId, apiUrl, webUrl }) {
  step("GitHub: environment, secrets e variables");
  const useEnv = ensureEnvironment(repo);
  const scope = useEnv ? ["--env", "production"] : [];

  const existingSecrets = DRY_RUN
    ? []
    : (gh(["secret", "list", "-R", repo, ...scope, "--json", "name", "-q", ".[].name"], { allowFailure: true }) ?? "")
        .split("\n")
        .filter(Boolean);

  const secrets = { CLOUDFLARE_API_TOKEN: cfToken, CLOUDFLARE_ACCOUNT_ID: accountId };
  for (const name of PROJECT.generatedSecrets) {
    if (existingSecrets.includes(name) && !ROTATE) info(`${name} já existe (use --rotate-secrets para trocar)`);
    else secrets[name] = randomBytes(48).toString("base64");
  }
  for (const [name, value] of Object.entries(secrets)) {
    // valor via stdin: nunca aparece na lista de processos
    gh(["secret", "set", name, "-R", repo, ...scope], { input: value, mutates: true });
    applied(`secret ${name}`);
  }

  const variables = { D1_DATABASE_ID: d1Id, ...(kvId ? { KV_NAMESPACE_ID: kvId } : {}), API_URL: apiUrl, WEB_URL: webUrl };
  for (const [name, value] of Object.entries(variables)) {
    gh(["variable", "set", name, "-R", repo, ...scope, "--body", value], { mutates: true });
    applied(`variable ${name} = ${value}`);
  }
}

async function firstDeploy(repo) {
  step("Primeiro deploy");
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], { allowFailure: true }) ?? "main";
  if (branch !== "main") {
    warn(`Você está na branch "${branch}". O deploy roda a partir da main.`);
    return;
  }
  const dirty = git(["status", "--porcelain"]) !== "";
  const hasCommits = git(["rev-parse", "HEAD"], { allowFailure: true }) !== null;

  if (dirty || !hasCommits) {
    if (!(await confirm("Fazer commit de tudo e push para a main (dispara o deploy)?", false))) {
      info(`Quando quiser: ${bold('git add -A && git commit -m "chore: setup deploy" && git push -u origin main')}`);
      return;
    }
    git(["add", "-A"], { mutates: true });
    git(["commit", "-m", "chore: configura deploy automático"], { mutates: true });
    git(["push", "-u", "origin", "main"], { mutates: true });
    applied("Push feito — o GitHub Actions já começou");
  } else if (await confirm("Nada para commitar. Disparar o workflow agora?", true)) {
    git(["push", "-u", "origin", "main"], { mutates: true, allowFailure: true });
    gh(["workflow", "run", "ci.yml", "-R", repo, "--ref", "main"], { mutates: true });
    applied("Workflow disparado");
  }
  info(`Acompanhe: ${bold(`gh run watch -R ${repo}`)}  ou  https://github.com/${repo}/actions`);
}

// ---------------------------------------------------------------- main
async function main() {
  console.log(bold(`\n${PROJECT.name} · configuração do deploy automático${DRY_RUN ? " (dry-run)" : ""}`));
  if (resolve(cwd()) !== ROOT) info(`Usando o projeto em ${ROOT}`);

  await checkPrerequisites();
  const repo = await ensureGitHubRepo();
  ensureWorkflowAndLockfile();
  const cloudflare = await provisionCloudflare();
  configureGitHub(repo, cloudflare);
  await firstDeploy(repo);

  console.log(`\n${green(bold("Pronto!"))} A partir de agora, todo push na main faz deploy sozinho.`);
  console.log(`  Web: ${cloudflare.webUrl}\n  API: ${cloudflare.apiUrl}\n`);
}

main().catch((error) => {
  console.error(`\n  ${red("✖")} ${error instanceof SetupError ? error.message : error.stack}\n`);
  exit(1);
});

