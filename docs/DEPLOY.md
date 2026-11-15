# Deploy automático (GitHub Actions → Cloudflare)

Depois da configuração abaixo (feita **uma vez**), todo `git push` na `main`:

```
lint → typecheck → testes → migrations D1 → API (Workers + Durable Object) → Web (Pages) → smoke test
```

Pull requests rodam só a validação. Dá para redeployar manualmente em **Actions → CI/CD → Run workflow**.

---

## ⚡ Configuração automática (recomendado)

Pré-requisitos: Node 20+, pnpm e o [GitHub CLI](https://cli.github.com) logado (`gh auth login`).

```bash
pnpm setup:deploy            # ou: pnpm setup:deploy --dry-run  para só ver o que seria feito
```

O script pede **só o token da Cloudflare** (passo 2 abaixo) e faz o resto:

- cria o repositório no GitHub, se ainda não existir;
- move o workflow para `.github/workflows/` e gera o `pnpm-lock.yaml`;
- cria (ou reaproveita) o D1, o namespace KV das fotos e o projeto Pages via API da Cloudflare;
- descobre as URLs reais da API (`*.workers.dev`) e do front (`*.pages.dev`);
- cria o environment `production` (deploy só a partir da `main`) com todos os secrets e variables; gera o `JWT_SECRET`;
- oferece commit + push para disparar o primeiro deploy.

Pode rodar quantas vezes quiser: o que já existe é só conferido (o `JWT_SECRET` só muda com `--rotate-secrets`).
Para rodar sem perguntas: `CLOUDFLARE_API_TOKEN=... pnpm setup:deploy --yes`.

---

## Configuração manual (alternativa)

### 1. Criar os recursos na Cloudflare (uma vez)

```bash
npx wrangler login

npx wrangler d1 create comandai-db                        # anote o "database_id"
npx wrangler kv namespace create comandai-images          # anote o "id"
npx wrangler pages project create comandai --production-branch main
```

Ao final você terá:
- **API**: `https://comandai-api.<seu-subdominio>.workers.dev` (criada no primeiro deploy)
- **Web**: `https://comandai.pages.dev` (ou o nome que a Cloudflare atribuir — confira no painel do Pages)

### 2. Criar o token da API

Cloudflare → **My Profile → API Tokens → Create Token → Custom token**, com permissões de **Account**:

| Permissão | Nível |
|---|---|
| Workers Scripts | Edit |
| D1 | Edit |
| Workers KV Storage | Edit |
| Cloudflare Pages | Edit |
| Account Settings | Read |

O **Account ID** fica na barra lateral do painel da Cloudflare (Workers & Pages → Overview).

### 3. Configurar o repositório no GitHub

**Settings → Environments → New environment → `production`**. Dentro dele:

**Secrets**

| Nome | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | token do passo 2 |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta |
| `JWT_SECRET` | `openssl rand -base64 48` |

**Variables**

| Nome | Exemplo |
|---|---|
| `D1_DATABASE_ID` | `a1b2c3d4-...` (passo 1) |
| `KV_NAMESPACE_ID` | `0f1e2d...` (passo 1) |
| `API_URL` | `https://comandai-api.seu-subdominio.workers.dev` |
| `WEB_URL` | `https://comandai.pages.dev` |

> Dica: em **Environments → production → Deployment branches**, restrinja a `main`. Opcionalmente, ative **Required reviewers** para aprovar cada deploy.

### 4. Primeiro deploy

```bash
pnpm install                 # gera o pnpm-lock.yaml (o CI exige ele commitado)
git add . && git commit -m "chore: setup CI/CD"
git push origin main
```

Acompanhe em **Actions**. O resumo do job mostra as URLs publicadas.

Quer dados de demonstração em produção? Rode uma vez localmente:

```bash
cd apps/api && npx wrangler d1 execute comandai-db --remote --file=./seed/seed.sql
```

---

## Como o pipeline funciona

| Etapa | Por quê |
|---|---|
| `concurrency: deploy-production` | dois pushes seguidos nunca fazem deploy ao mesmo tempo |
| IDs do D1 e do KV injetados via `sed` | os IDs reais não precisam ficar versionados; o `wrangler.toml` do repo serve para dev local |
| Migrations **antes** da API | o código novo encontra o schema que espera |
| `--var ALLOWED_ORIGIN:$WEB_URL` | CORS liberado só para o front publicado |
| `wrangler secret put JWT_SECRET` | o segredo vem do GitHub, nunca do código |
| Smoke test (`/health` + home) | o job fica vermelho se o deploy subir quebrado |

### Regra para migrations (expand → contract)

Como as migrations rodam antes do código novo, o código **antigo** precisa continuar funcionando com o schema novo por alguns segundos:

1. ✅ Adicionar tabela, coluna com `DEFAULT`, índice → pode no mesmo PR.
2. ⚠️ Renomear/remover coluna → em **dois** PRs: primeiro o código para de usar, depois a migration remove.

### Rollback

- **API**: `npx wrangler rollback` (volta para a versão anterior do Worker) ou pelo painel *Workers → Deployments*.
- **Web**: painel do Pages → *Deployments* → *Rollback* no deploy anterior.
- **D1**: Time Travel — `npx wrangler d1 time-travel restore comandai-db --timestamp=<ISO>`.

### Proteção do endpoint público

Recomendado: em **Security → WAF → Rate limiting rules**, limite `POST /api/public/*/orders` (ex.: 10 req/min por IP).
