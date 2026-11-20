import { placeOrderInputSchema, type PlaceOrderResultDto } from "@comandai/contracts";
import { Hono } from "hono";
import type { AppEnv } from "../container";
import { toOrderDto, toPublicMenuDto } from "../presenters";
import { requireHuman } from "../middlewares/require-human";
import { validate } from "../validate";

/** Rotas sem login: o cardápio do cliente final. */
export const publicRoutes = new Hono<AppEnv>()
  .get("/:slug/menu", async (c) => {
    const menu = await c.var.useCases.getPublicMenu.execute(c.req.param("slug"));
    c.header("Cache-Control", "public, max-age=30"); // alivia o D1 em horário de pico
    return c.json(toPublicMenuDto(menu, new URL(c.req.url).origin));
  })
  .post("/:slug/orders", validate("json", placeOrderInputSchema), requireHuman("order"), async (c) => {
    const { order, whatsappUrl } = await c.var.useCases.placeOrder.execute(c.req.param("slug"), c.req.valid("json"));
    return c.json({ order: toOrderDto(order), whatsappUrl } satisfies PlaceOrderResultDto, 201);
  });

/**
 * Fotos dos produtos servidas do KV (ADR-0006).
 * A chave muda a cada upload, então a resposta pode ser cacheada para sempre no navegador e na CDN.
 */
export const imageRoutes = new Hono<AppEnv>().get("/:key{.+}", async (c) => {
  const { value, metadata } = await c.env.IMAGES.getWithMetadata<{ contentType: string }>(c.req.param("key"), {
    type: "arrayBuffer",
    cacheTtl: 86_400, // cache no edge: leituras repetidas nem chegam a contar na cota do KV
  });
  if (!value) return c.notFound();

  return new Response(value, {
    headers: {
      "Content-Type": metadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
