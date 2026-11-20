import type { MiddlewareHandler } from "hono";
import { HumanVerificationFailedError } from "../../../domain";
import type { AppEnv } from "../container";

/** Header com o token do widget Turnstile. Vai no header para não misturar com o corpo validado pelo Zod. */
export const HUMAN_TOKEN_HEADER = "x-turnstile-token";

/**
 * Exige que a requisição venha de uma pessoa (ADR-0007).
 * Use DEPOIS da validação do corpo: dados inválidos são recusados sem gastar o token, que é de uso único.
 */
export function requireHuman(action: "login" | "register" | "order"): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = c.req.header(HUMAN_TOKEN_HEADER) ?? "";
    const remoteIp = c.req.header("cf-connecting-ip");
    const isHuman = await c.var.human.verify(token, { action, remoteIp });
    if (!isHuman) throw new HumanVerificationFailedError();
    await next();
  };
}
