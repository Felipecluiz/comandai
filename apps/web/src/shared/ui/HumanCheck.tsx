import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Verificação anti-robô com Cloudflare Turnstile (ADR-0007).
 * O widget gera um token de uso único que vai no header `x-turnstile-token`; a API confere no Siteverify.
 */

export type HumanAction = "login" | "register" | "order";

interface TurnstileOptions {
  sitekey: string;
  action: HumanAction;
  theme: "auto" | "light" | "dark";
  language: string;
  size: "normal" | "flexible" | "compact";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Chave de TESTE da Cloudflare (sempre passa) só em `pnpm dev`; o build de produção exige a chave real. */
const TEST_SITE_KEY = "1x00000000000000000000AA";
const SITE_KEY: string = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TEST_SITE_KEY : "");
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi> | null = null;

/** Carrega o script da Cloudflare uma única vez, mesmo com várias telas usando o widget. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile não carregou")));
    script.onerror = () => {
      loading = null; // permite tentar de novo numa próxima tela
      reject(new Error("Turnstile não carregou"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export interface HumanCheckState {
  /** Token pronto para enviar; null enquanto a verificação não terminou ou depois de expirar/ser usado. */
  token: string | null;
  /** Gera um token novo. Chame depois de qualquer erro da API: o token é de uso único. */
  reset: () => void;
  /** O widget não pôde ser exibido (sem chave configurada, bloqueador, rede). */
  unavailable: boolean;
  /** Ref de callback: o widget é montado quando o elemento aparece (a tela pode estar carregando antes). */
  containerRef: (element: HTMLDivElement | null) => void;
}

export function useHumanCheck(action: HumanAction): HumanCheckState {
  const [container, containerRef] = useState<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!container || !SITE_KEY) return;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId.current = api.render(container, {
          sitekey: SITE_KEY,
          action,
          theme: "auto",
          language: "pt-br",
          size: "flexible",
          callback: (value) => {
            setToken(value);
            setFailed(false);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [container, action]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return { token, reset, unavailable: failed || !SITE_KEY, containerRef };
}

/** Onde o widget aparece no formulário. */
export function HumanCheck({ state }: { state: HumanCheckState }) {
  return (
    <div className="human-check">
      <div ref={state.containerRef} className="human-check__widget" />
      {state.unavailable && (
        <p className="field__error" role="alert">
          Não foi possível carregar a verificação anti-robô. Desative bloqueadores para este site e recarregue a página.
        </p>
      )}
    </div>
  );
}
