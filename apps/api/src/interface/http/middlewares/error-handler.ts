import type { ApiErrorBody } from "@comandai/contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError } from "zod";
import { DomainError, ValidationError, type DomainErrorCode } from "../../../domain";

/** Único ponto de tradução domínio → HTTP (constitution IV.2). */
const STATUS_BY_CODE: Record<DomainErrorCode, ContentfulStatusCode> = {
  VALIDATION_ERROR: 422,
  INVALID_IMAGE: 422,
  RESTAURANT_CLOSED: 422,
  PRODUCT_UNAVAILABLE: 422,
  MIN_ORDER_NOT_REACHED: 422,
  INVALID_STATUS_TRANSITION: 422,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  NOT_FOUND: 404,
  SLUG_TAKEN: 409,
  EMAIL_TAKEN: 409,
  CATEGORY_NAME_TAKEN: 409,
  CATEGORY_NOT_EMPTY: 409,
  HUMAN_VERIFICATION_FAILED: 403,
};

export function handleError(err: Error, c: Context): Response {
  if (err instanceof DomainError) {
    const body: ApiErrorBody = { error: { code: err.code, message: err.message } };
    if (err instanceof ValidationError) body.error.details = { [err.field]: [err.message] };
    return c.json(body, STATUS_BY_CODE[err.code]);
  }
  console.error(err);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Erro inesperado" } } satisfies ApiErrorBody, 500);
}

export function validationErrorResponse(error: ZodError, c: Context): Response {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    details[path] = [...(details[path] ?? []), issue.message];
  }
  const body: ApiErrorBody = { error: { code: "VALIDATION_ERROR", message: "Dados inválidos", details } };
  return c.json(body, 422);
}
