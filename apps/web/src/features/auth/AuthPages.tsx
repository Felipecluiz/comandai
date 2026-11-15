import type { SessionDto } from "@comandai/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authApi } from "../../shared/api/http";
import { maskPhone, slugify } from "../../shared/lib/format";
import { ErrorMessage, Field, fieldError, hasFieldErrors } from "../../shared/ui/feedback";
import { sessionStore, useSession } from "./session";

function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main className="auth">
      <Link to="/" className="brand">
        <span className="brand__mark">◉</span> Comandaí
      </Link>
      <div className="card auth__card">
        <h1>{title}</h1>
        {children}
      </div>
      <p className="muted">{footer}</p>
    </main>
  );
}

function useAuthMutation(path: "/login" | "/register") {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: unknown) => authApi.post<SessionDto>(path, body),
    onSuccess: (session) => {
      sessionStore.set(session);
      navigate("/admin", { replace: true });
    },
  });
}

export function LoginPage() {
  const session = useSession();
  const login = useAuthMutation("/login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (session) return <Navigate to="/admin" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <AuthShell title="Entrar no painel" footer={<>Ainda não tem conta? <Link to="/cadastro">Cadastre seu restaurante</Link></>}>
      <form className="form" onSubmit={submit}>
        <Field label="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Senha">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {login.error && <ErrorMessage error={login.error} />}
        <button className="btn btn--primary btn--block" disabled={login.isPending}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </button>
        <p className="muted small">Demo: demo@comandai.dev / demo1234</p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const session = useSession();
  const register = useAuthMutation("/register");
  const [form, setForm] = useState({ restaurantName: "", slug: "", whatsapp: "", email: "", password: "" });
  const [slugTouched, setSlugTouched] = useState(false);

  if (session) return <Navigate to="/admin" replace />;

  const err = (field: string) => fieldError(register.error, field);
  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({
      ...f,
      [key]: value,
      // sugere o endereço a partir do nome até o usuário editar o campo
      ...(key === "restaurantName" && !slugTouched ? { slug: slugify(value) } : {}),
    }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    register.mutate(form);
  };

  return (
    <AuthShell title="Cadastre seu restaurante" footer={<>Já tem conta? <Link to="/login">Entrar</Link></>}>
      <form className="form" onSubmit={submit} noValidate>
        <Field label="Nome do restaurante" error={err("restaurantName") ?? err("name")}>
          <input value={form.restaurantName} onChange={(e) => update("restaurantName", e.target.value)} required />
        </Field>
        <Field label="Endereço do cardápio" error={err("slug")} hint={`${location.origin}/r/${form.slug || "seu-restaurante"}`}>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", e.target.value.toLowerCase());
            }}
            required
          />
        </Field>
        <Field label="WhatsApp que recebe os pedidos" error={err("whatsapp")}>
          <input
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", maskPhone(e.target.value))}
            inputMode="tel"
            placeholder="(11) 98765-4321"
            required
          />
        </Field>
        <Field label="E-mail" error={err("email")}>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Senha" error={err("password")} hint="Mínimo 8 caracteres">
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        {register.error && !hasFieldErrors(register.error) && <ErrorMessage error={register.error} />}
        <button className="btn btn--primary btn--block" disabled={register.isPending}>
          {register.isPending ? "Criando…" : "Criar conta grátis"}
        </button>
      </form>
    </AuthShell>
  );
}
