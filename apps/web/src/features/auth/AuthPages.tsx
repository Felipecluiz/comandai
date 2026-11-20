import type { SessionDto } from "@comandai/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { authApi, humanHeaders } from "../../shared/api/http";
import { maskPhone, slugify } from "../../shared/lib/format";
import { ErrorMessage, Field, fieldError, hasFieldErrors } from "../../shared/ui/feedback";
import { HumanCheck, useHumanCheck, type HumanCheckState } from "../../shared/ui/HumanCheck";
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

/** Login e cadastro: exigem a verificação anti-robô e pedem um token novo a cada erro (uso único). */
function useAuthMutation(path: "/login" | "/register", human: HumanCheckState) {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: ({ body, humanToken }: { body: unknown; humanToken: string }) =>
      authApi.post<SessionDto>(path, body, humanHeaders(humanToken)),
    onError: human.reset,
    onSuccess: (session) => {
      sessionStore.set(session);
      navigate("/admin", { replace: true });
    },
  });
  const submit = (body: unknown) => {
    if (human.token) mutation.mutate({ body, humanToken: human.token });
  };
  return { ...mutation, submit };
}

export function LoginPage() {
  const session = useSession();
  const human = useHumanCheck("login");
  const login = useAuthMutation("/login", human);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (session) return <Navigate to="/admin" replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.submit({ email, password });
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
        <HumanCheck state={human} />
        <button className="btn btn--primary btn--block" disabled={login.isPending || !human.token}>
          {login.isPending ? "Entrando…" : human.token ? "Entrar" : "Verificando…"}
        </button>
        <p className="muted small">Demo: demo@comandai.dev / demo1234</p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const session = useSession();
  const human = useHumanCheck("register");
  const register = useAuthMutation("/register", human);
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
    register.submit(form);
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
        <HumanCheck state={human} />
        <button className="btn btn--primary btn--block" disabled={register.isPending || !human.token}>
          {register.isPending ? "Criando…" : human.token ? "Criar conta grátis" : "Verificando…"}
        </button>
      </form>
    </AuthShell>
  );
}
