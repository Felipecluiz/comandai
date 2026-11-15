import { createMiddleware } from "hono/factory";
import { UnauthorizedError } from "../../../domain";
import type { AppEnv } from "../container";

/**
 * Exige um token válido e coloca o Actor no contexto (AC-001.6).
 * WebSockets no navegador não enviam headers customizados, por isso o stream aceita `?token=`.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : c.req.query("token");
  const actor = token ? await c.var.tokens.verify(token) : null;
  if (!actor) throw new UnauthorizedError();

  c.set("actor", actor);
  await next();
});
