import type { ReactNode } from "react";
import { ApiError } from "../api/http";

export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="loading" aria-busy="true">
      <span className="spinner" aria-hidden /> {label}
    </div>
  );
}

export function ErrorMessage({ error }: { error: unknown }) {
  const message = error instanceof ApiError ? error.message : "Algo deu errado. Tente novamente.";
  return (
    <p className="alert" role="alert">
      {message}
    </p>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function fieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.details[field]?.[0];
}

export function hasFieldErrors(error: unknown): boolean {
  return error instanceof ApiError && Object.keys(error.details).length > 0;
}

/** Input com label e erro — evita repetir o mesmo markup em todo formulário. */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {error ? <small className="field__error">{error}</small> : hint && <small className="field__hint">{hint}</small>}
    </label>
  );
}
