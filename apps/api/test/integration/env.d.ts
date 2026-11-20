declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    IMAGES: KVNamespace;
    ORDERS_HUB: DurableObjectNamespace;
    JWT_SECRET: string;
    TURNSTILE_DISABLED: string;
    TEST_MIGRATIONS: D1Migration[];
  }
}
