import type { HumanVerifier } from "../../application";

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

interface SiteverifyResponse {
  success: boolean;
  action?: string;
  "error-codes"?: string[];
}

/**
 * Adapter do Cloudflare Turnstile (ADR-0007): valida o token no endpoint Siteverify.
 * Falha fechada: sem secret, sem token, erro de rede ou timeout → não é humano.
 */
export class TurnstileVerifier implements HumanVerifier {
  constructor(
    private readonly secret: string | undefined,
    // Embrulhado numa arrow: no Workers, chamar o `fetch` global "solto" lança "Illegal invocation".
    private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
    private readonly timeoutMs = 5_000,
  ) {}

  async verify(token: string, context: { action: string; remoteIp?: string }): Promise<boolean> {
    if (!this.secret) {
      console.error("TURNSTILE_SECRET_KEY não configurado: requisições protegidas serão recusadas.");
      return false;
    }
    // Tokens reais têm até 2048 caracteres; nada além disso vale a ida à Cloudflare.
    if (!token || token.length > 2048) return false;

    const body = new FormData();
    body.append("secret", this.secret);
    body.append("response", token);
    if (context.remoteIp) body.append("remoteip", context.remoteIp);

    try {
      const response = await this.fetcher(SITEVERIFY_URL, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) return false;
      const result = (await response.json()) as SiteverifyResponse;
      if (!result.success) return false;
      // O widget de cada tela envia sua action; um token do login não serve para fazer pedido.
      // As chaves de teste da Cloudflare não devolvem action, por isso só comparamos quando vem preenchida.
      return !result.action || result.action === context.action;
    } catch (error) {
      console.error("Turnstile indisponível:", error);
      return false;
    }
  }
}

/**
 * Desliga a verificação. Só para testes de integração e desenvolvimento local,
 * quando `TURNSTILE_DISABLED=true` está explícito na configuração.
 */
export class DisabledHumanVerifier implements HumanVerifier {
  async verify(): Promise<boolean> {
    return true;
  }
}
