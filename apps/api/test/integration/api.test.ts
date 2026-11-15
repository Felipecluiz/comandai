import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

/** Ponta a ponta: HTTP → Hono → casos de uso → D1/KV/Durable Object reais (Miniflare). */

const BASE = "http://comandai.test";

async function call(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  return SELF.fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

let seq = 0;
async function newRestaurant() {
  seq += 1;
  const slug = `restaurante-${seq}-${Date.now()}`;
  const res = await call("POST", "/api/auth/register", {
    restaurantName: "Pizzaria Teste",
    slug,
    whatsapp: "(11) 98765-4321",
    email: `${slug}@teste.com`,
    password: "senha-segura",
  });
  expect(res.status).toBe(201);
  const { token } = await res.json<{ token: string }>();

  await call("PATCH", "/api/admin/restaurant", { isOpen: true, deliveryFeeCents: 500 }, token);
  const category = await (await call("POST", "/api/admin/categories", { name: "Pizzas" }, token)).json<{ id: string }>();
  const product = await (
    await call("POST", "/api/admin/products", { categoryId: category.id, name: "Calabresa", priceCents: 4000 }, token)
  ).json<{ id: string }>();
  return { slug, token, productId: product.id };
}

const order = (productId: string) => ({
  customer: { name: "Maria", phone: "11912345678" },
  fulfillment: { type: "delivery", address: { street: "Rua A", number: "10", district: "Centro" } },
  payment: { method: "pix" },
  items: [{ productId, quantity: 2, priceCents: 1 }], // priceCents deve ser ignorado (AC-003.2)
});

describe("Fluxo completo", () => {
  it("cadastro → cardápio → pedido → WhatsApp → painel → dashboard", async () => {
    const { slug, token, productId } = await newRestaurant();

    const menu = await (await call("GET", `/api/public/${slug}/menu`)).json<{ sections: unknown[] }>();
    expect(menu.sections).toHaveLength(1);

    const placed = await call("POST", `/api/public/${slug}/orders`, order(productId));
    expect(placed.status).toBe(201);
    const { order: created, whatsappUrl } = await placed.json<{ order: { id: string; totalCents: number; number: number }; whatsappUrl: string }>();
    expect(created).toMatchObject({ number: 1, totalCents: 8500 });
    expect(whatsappUrl.startsWith("https://wa.me/5511987654321?text=")).toBe(true);

    const accepted = await call("PATCH", `/api/admin/orders/${created.id}/status`, { status: "accepted" }, token);
    expect(accepted.status).toBe(200);

    const dashboard = await (await call("GET", "/api/admin/dashboard?period=today", undefined, token)).json();
    expect(dashboard).toMatchObject({ revenueCents: 8500, orders: 1 });
  });

  it("AC-001.6 rota admin sem token responde 401", async () => {
    expect((await call("GET", "/api/admin/restaurant")).status).toBe(401);
    expect((await call("GET", "/api/admin/restaurant", undefined, "token-falso")).status).toBe(401);
  });

  it("AC-004.5 restaurante B não altera pedido do restaurante A", async () => {
    const a = await newRestaurant();
    const b = await newRestaurant();
    const { order: created } = await (await call("POST", `/api/public/${a.slug}/orders`, order(a.productId))).json<{
      order: { id: string };
    }>();
    const res = await call("PATCH", `/api/admin/orders/${created.id}/status`, { status: "accepted" }, b.token);
    expect(res.status).toBe(404);
  });

  it("AC-003.7 números sequenciais por restaurante via UPDATE … RETURNING", async () => {
    const { slug, productId } = await newRestaurant();
    const numbers = [];
    for (let i = 0; i < 3; i++) {
      const res = await call("POST", `/api/public/${slug}/orders`, order(productId));
      numbers.push((await res.json<{ order: { number: number } }>()).order.number);
    }
    expect(numbers).toEqual([1, 2, 3]);
  });

  it("AC-004.4 painel conectado recebe order.created pelo WebSocket", async () => {
    const { slug, token, productId } = await newRestaurant();

    const upgrade = await SELF.fetch(`${BASE}/api/admin/orders/stream?token=${token}`, {
      headers: { Upgrade: "websocket" },
    });
    const socket = upgrade.webSocket!;
    socket.accept();
    const received = new Promise<string>((resolve) => socket.addEventListener("message", (e) => resolve(e.data as string)));

    await call("POST", `/api/public/${slug}/orders`, order(productId));
    const event = JSON.parse(await received);
    expect(event).toMatchObject({ type: "order.created", order: { number: 1 } });
    socket.close();
  });

  it("AC-002.5 upload de imagem vai para o KV e é servido em /api/images", async () => {
    const { token, productId } = await newRestaurant();
    const form = new FormData();
    form.set("image", new File([new Uint8Array([137, 80, 78, 71])], "foto.png", { type: "image/png" }));

    const res = await SELF.fetch(`${BASE}/api/admin/products/${productId}/image`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const { imageUrl } = await res.json<{ imageUrl: string }>();
    const image = await SELF.fetch(imageUrl);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
  });
});
