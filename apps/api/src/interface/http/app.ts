import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { TokenService } from "../../application";
import { buildUseCases, type AppEnv, type Bindings, type Dependencies } from "./container";
import { handleError } from "./middlewares/error-handler";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { imageRoutes, publicRoutes } from "./routes/public";

export type DependencyFactory = (env: Bindings) => Dependencies & { tokens: TokenService };

/** O app recebe a fábrica de dependências: D1/KV/DO em produção, memória nos testes. */
export function createApp(makeDependencies: DependencyFactory) {
  const app = new Hono<AppEnv>()
    .use("*", logger())
    .use("*", secureHeaders({ crossOriginResourcePolicy: "cross-origin" }))
    .use("/api/*", (c, next) => cors({ origin: c.env?.ALLOWED_ORIGIN ?? "*" })(c, next))
    .use("/api/*", async (c, next) => {
      const deps = makeDependencies(c.env);
      c.set("useCases", buildUseCases(deps));
      c.set("tokens", deps.tokens);
      c.set("human", deps.human);
      await next();
    })
    .get("/health", (c) => c.json({ status: "ok" }))
    .route("/api/auth", authRoutes)
    .route("/api/public", publicRoutes)
    .route("/api/images", imageRoutes)
    .route("/api/admin", adminRoutes);

  app.onError(handleError);
  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Rota não encontrada" } }, 404));
  return app;
}
