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
  headers?: Record<string, string>;
}

/** Header com o token da verificação anti-robô (Turnstile, ADR-0007). */
export const humanHeaders = (token: string) => ({ "x-turnstile-token": token });

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return `${API_URL}/api${path}${qs ? `?${qs}` : ""}`;
}

function buildInit(method: string, { body, auth = false, headers: extra }: RequestOptions): RequestInit {
  const headers = new Headers(extra);
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers.set("content-type", "application/json");

  const session = sessionStore.get();
  if (auth && session) headers.set("authorization", `Bearer ${session.token}`);

  const payload = isForm ? body : body === undefined ? undefined : JSON.stringify(body);
  return { method, headers, body: payload };
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    payload?.error.code ?? "INTERNAL_ERROR",
    payload?.error.message ?? "Falha de comunicação. Tente novamente.",
    payload?.error.details,
  );
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), buildInit(method, options));

  if (response.status === 401 && options.auth) sessionStore.set(null); // sessão expirou → volta pro login
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Cliente público (cardápio, pedido) */
export const publicApi = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body: unknown, headers?: Record<string, string>) => request<T>("POST", path, { body, headers }),
};

/** Cliente autenticado (painel) */
export const adminApi = {
  get: <T>(path: string, query?: Query) => request<T>("GET", `/admin${path}`, { query, auth: true }),
  post: <T>(path: string, body: unknown) => request<T>("POST", `/admin${path}`, { body, auth: true }),
  put: <T>(path: string, body: unknown) => request<T>("PUT", `/admin${path}`, { body, auth: true }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", `/admin${path}`, { body, auth: true }),
  delete: (path: string) => request<undefined>("DELETE", `/admin${path}`, { auth: true }),
};

export const authApi = {
  post: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>("POST", `/auth${path}`, { body, headers }),
};

/** URL do WebSocket do painel, respeitando VITE_API_URL ou o proxy do Vite. */
export function ordersStreamUrl(token: string): string {
  const base = API_URL || window.location.origin;
  return `${base.replace(/^http/, "ws")}/api/admin/orders/stream?token=${encodeURIComponent(token)}`;
}
