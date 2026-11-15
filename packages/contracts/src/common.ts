import { z } from "zod";

export const idSchema = z.string().min(1).max(64);
export const centsSchema = z.number().int("Use centavos inteiros").min(0);

export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "INVALID_CREDENTIALS",
  "NOT_FOUND",
  "SLUG_TAKEN",
  "EMAIL_TAKEN",
  "CATEGORY_NAME_TAKEN",
  "CATEGORY_NOT_EMPTY",
  "INVALID_IMAGE",
  "RESTAURANT_CLOSED",
  "PRODUCT_UNAVAILABLE",
  "MIN_ORDER_NOT_REACHED",
  "INVALID_STATUS_TRANSITION",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, string[]> };
}
