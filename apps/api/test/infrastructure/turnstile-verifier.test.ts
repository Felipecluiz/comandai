import { describe, expect, it } from "vitest";
import { SITEVERIFY_URL, TurnstileVerifier } from "../../src/infrastructure/turnstile/turnstile-verifier";

/** Fetch falso que responde como o Siteverify e guarda o que foi enviado. */
function fakeSiteverify(reply: unknown, status = 200) {
  const requests: Array<{ url: string; form: FormData }> = [];
  const fetcher = async (url: string, init: RequestInit) => {
    requests.push({ url, form: init.body as FormData });
    return new Response(JSON.stringify(reply), { status });
  };
  return { fetcher, requests };
}

const order = { action: "order", remoteIp: "203.0.113.7" };

describe("TurnstileVerifier (ADR-0007)", () => {
  it("aceita quando o Siteverify confirma e envia secret, token e IP", async () => {
    const { fetcher, requests } = fakeSiteverify({ success: true, action: "order" });
    const verifier = new TurnstileVerifier("segredo", fetcher);

    await expect(verifier.verify("token-valido", order)).resolves.toBe(true);
    expect(requests[0]?.url).toBe(SITEVERIFY_URL);
    expect(requests[0]?.form.get("secret")).toBe("segredo");
    expect(requests[0]?.form.get("response")).toBe("token-valido");
    expect(requests[0]?.form.get("remoteip")).toBe("203.0.113.7");
  });

  it("recusa quando o Siteverify nega", async () => {
    const { fetcher } = fakeSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    await expect(new TurnstileVerifier("segredo", fetcher).verify("token", order)).resolves.toBe(false);
  });

  it("recusa token gerado para outra tela (action diferente)", async () => {
    const { fetcher } = fakeSiteverify({ success: true, action: "login" });
    await expect(new TurnstileVerifier("segredo", fetcher).verify("token", order)).resolves.toBe(false);
  });

  it("aceita resposta sem action (chaves de teste da Cloudflare)", async () => {
    const { fetcher } = fakeSiteverify({ success: true });
    await expect(new TurnstileVerifier("segredo", fetcher).verify("token", order)).resolves.toBe(true);
  });

  it("falha fechada: sem secret, sem token, HTTP de erro ou rede fora", async () => {
    const { fetcher, requests } = fakeSiteverify({ success: true });
    await expect(new TurnstileVerifier(undefined, fetcher).verify("token", order)).resolves.toBe(false);
    await expect(new TurnstileVerifier("segredo", fetcher).verify("", order)).resolves.toBe(false);
    expect(requests).toHaveLength(0); // nem chega a chamar a Cloudflare

    const erro500 = fakeSiteverify({}, 500);
    await expect(new TurnstileVerifier("segredo", erro500.fetcher).verify("token", order)).resolves.toBe(false);

    const semRede = async () => {
      throw new TypeError("network down");
    };
    await expect(new TurnstileVerifier("segredo", semRede).verify("token", order)).resolves.toBe(false);
  });
});
