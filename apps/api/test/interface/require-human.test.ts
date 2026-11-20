import { describe, expect, it } from "vitest";
import { createApp } from "../../src/interface/http/app";
import type { Bindings } from "../../src/interface/http/container";
import { makeSut, registration } from "../helpers";

/** As três rotas abertas exigem o token do Turnstile no header x-turnstile-token (ADR-0007). */
function makeApp() {
  const sut = makeSut();
  const app = createApp(() => sut);
  const env = { ALLOWED_ORIGIN: "*" } as Bindings;
  const post = (path: string, body: unknown, humanToken?: string) =>
    app.request(
      path,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...(humanToken ? { "x-turnstile-token": humanToken } : {}) },
        body: JSON.stringify(body),
      },
      env,
    );
  return { post, human: sut.human };
}

describe("requireHuman", () => {
  it("recusa cadastro, login e pedido sem token com 403 HUMAN_VERIFICATION_FAILED", async () => {
    const { post } = makeApp();
    const responses = await Promise.all([
      post("/api/auth/register", registration),
      post("/api/auth/login", { email: registration.email, password: registration.password }),
      post("/api/public/pizzaria-do-ze/orders", {
        customer: { name: "Maria", phone: "11912345678" },
        fulfillment: { type: "pickup" },
        payment: { method: "pix" },
        items: [{ productId: "p1", quantity: 1 }],
      }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ error: { code: "HUMAN_VERIFICATION_FAILED" } });
    }
  });

  it("libera com token válido e informa a action de cada tela", async () => {
    const { post, human } = makeApp();
    const registered = await post("/api/auth/register", registration, "human-ok");
    expect(registered.status).toBe(201);

    const login = await post("/api/auth/login", { email: registration.email, password: registration.password }, "human-ok");
    expect(login.status).toBe(200);
    expect(human.calls.map((c) => c.action)).toEqual(["register", "login"]);
  });

  it("valida o corpo antes: dados inválidos não gastam o token", async () => {
    const { post, human } = makeApp();
    const response = await post("/api/auth/login", { email: "não-é-email" }, "human-ok");
    expect(response.status).toBe(422);
    expect(human.calls).toHaveLength(0);
  });
});
