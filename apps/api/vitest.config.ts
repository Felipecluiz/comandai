import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

/**
 * Unitários (test/domain, test/application) usam adapters em memória.
 * Integração (test/integration) roda o Worker de verdade no Miniflare: D1, KV e Durable Objects locais.
 */
export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  return {
    test: {
      setupFiles: ["./test/integration/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          wrangler: { configPath: "./wrangler.toml" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              JWT_SECRET: "test-secret-with-at-least-32-characters!!",
              // O fluxo ponta a ponta não fala com a Cloudflare; a verificação tem testes próprios.
              TURNSTILE_DISABLED: "true",
            },
          },
        },
      },
    },
  };
});
