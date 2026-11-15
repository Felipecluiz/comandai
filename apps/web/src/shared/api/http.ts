import type { ApiErrorBody, ErrorCode } from "@comandai/contracts";
import { sessionStore } from "../../features/auth/session";

export const API_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  body?: unknown;
  query?: Query;
  auth?: boolean;
}

async function request<T>(method: string, path: string, { body, query, auth = false }: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers.set("content-type", "application/json");

  const session = sessionStore.get();
  if (auth && session) headers.set("authorization", `Bearer ${session.token}`);

  const qs = query
    ? "?" + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][])
    : "";

  const response = await fetch(`${API_URL}/api${path}${qs}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (response.status === 401 && auth) sessionStore.set(null); // sessão expirou → volta pro login
  if (response.status === 204) return undefined as T;
  if (response.ok) return (await response.json()) as T;

  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
  throw new ApiError(
    response.status,
    payload?.error.code ?? "INTERNAL_ERROR",
    payload?.error.message ?? "Falha de comunicação. Tente novamente.",
    payload?.error.details,
  );
}

/** Cliente público (cardápio, pedido) */
export const publicApi = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, { body }),
};

/** Cliente autenticado (painel) */
export const adminApi = {
  get: <T>(path: string, query?: Query) => request<T>("GET", `/admin${path}`, { query, auth: true }),
  post: <T>(path: string, body: unknown) => request<T>("POST", `/admin${path}`, { body, auth: true }),
  put: <T>(path: string, body: unknown) => request<T>("PUT", `/admin${path}`, { body, auth: true }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", `/admin${path}`, { body, auth: true }),
  delete: (path: string) => request<void>("DELETE", `/admin${path}`, { auth: true }),
};

export const authApi = {
  post: <T>(path: string, body: unknown) => request<T>("POST", `/auth${path}`, { body }),
};

/** URL do WebSocket do painel, respeitando VITE_API_URL ou o proxy do Vite. */
export function ordersStreamUrl(token: string): string {
  const base = API_URL || window.location.origin;
  return `${base.replace(/^http/, "ws")}/api/admin/orders/stream?token=${encodeURIComponent(token)}`;
}
