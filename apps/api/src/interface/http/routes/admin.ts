import {
  categoryInputSchema,
  changeOrderStatusInputSchema,
  dashboardQuerySchema,
  listOrdersQuerySchema,
  productInputSchema,
  reorderCategoriesInputSchema,
  updateProductInputSchema,
  updateRestaurantInputSchema,
  type DashboardDto,
} from "@comandai/contracts";
import { Hono } from "hono";
import { InvalidImageError } from "../../../domain";
import type { AppEnv } from "../container";
import { requireAuth } from "../middlewares/auth";
import {
  toAdminCatalogDto,
  toCategoryDto,
  toOrderDto,
  toProductDto,
  toRestaurantDto,
} from "../presenters";
import { validate } from "../validate";

const origin = (url: string) => new URL(url).origin;

/** Tudo aqui exige login; o restaurantId vem do token (constitution II.2). */
export const adminRoutes = new Hono<AppEnv>()
  .use("*", requireAuth)

  // ---- Restaurante (spec 001)
  .get("/restaurant", async (c) => {
    const restaurant = await c.var.useCases.getMyRestaurant.execute(c.var.actor);
    return c.json(toRestaurantDto(restaurant));
  })
  .patch("/restaurant", validate("json", updateRestaurantInputSchema), async (c) => {
    const restaurant = await c.var.useCases.updateRestaurant.execute(c.var.actor, c.req.valid("json"));
    return c.json(toRestaurantDto(restaurant));
  })

  // ---- Catálogo (spec 002)
  .get("/catalog", async (c) => {
    const catalog = await c.var.useCases.catalog.getAdminCatalog(c.var.actor);
    return c.json(toAdminCatalogDto(catalog, origin(c.req.url)));
  })
  .post("/categories", validate("json", categoryInputSchema), async (c) => {
    const category = await c.var.useCases.catalog.createCategory(c.var.actor, c.req.valid("json").name);
    return c.json(toCategoryDto(category), 201);
  })
  .put("/categories/order", validate("json", reorderCategoriesInputSchema), async (c) => {
    const categories = await c.var.useCases.catalog.reorderCategories(c.var.actor, c.req.valid("json").ids);
    return c.json(categories.map(toCategoryDto));
  })
  .patch("/categories/:id", validate("json", categoryInputSchema), async (c) => {
    const { name } = c.req.valid("json");
    const category = await c.var.useCases.catalog.renameCategory(c.var.actor, c.req.param("id"), name);
    return c.json(toCategoryDto(category));
  })
  .delete("/categories/:id", async (c) => {
    await c.var.useCases.catalog.deleteCategory(c.var.actor, c.req.param("id"));
    return c.body(null, 204);
  })
  .post("/products", validate("json", productInputSchema), async (c) => {
    const product = await c.var.useCases.catalog.createProduct(c.var.actor, c.req.valid("json"));
    return c.json(toProductDto(product, origin(c.req.url)), 201);
  })
  .patch("/products/:id", validate("json", updateProductInputSchema), async (c) => {
    const product = await c.var.useCases.catalog.updateProduct(c.var.actor, c.req.param("id"), c.req.valid("json"));
    return c.json(toProductDto(product, origin(c.req.url)));
  })
  .delete("/products/:id", async (c) => {
    await c.var.useCases.catalog.deleteProduct(c.var.actor, c.req.param("id"));
    return c.body(null, 204);
  })
  .put("/products/:id/image", async (c) => {
    const body = await c.req.parseBody();
    const file = body["image"];
    if (!(file instanceof File)) throw new InvalidImageError('Envie o arquivo no campo "image"');

    const product = await c.var.useCases.catalog.uploadProductImage(c.var.actor, c.req.param("id"), {
      data: await file.arrayBuffer(),
      contentType: file.type,
    });
    return c.json(toProductDto(product, origin(c.req.url)));
  })

  // ---- Pedidos (spec 004)
  .get("/orders", validate("query", listOrdersQuerySchema), async (c) => {
    const orders = await c.var.useCases.listOrders.execute(c.var.actor, c.req.valid("query").scope);
    return c.json(orders.map(toOrderDto));
  })
  .patch("/orders/:id/status", validate("json", changeOrderStatusInputSchema), async (c) => {
    const { status, reason } = c.req.valid("json");
    const order = await c.var.useCases.changeOrderStatus.execute(c.var.actor, c.req.param("id"), status, reason);
    return c.json(toOrderDto(order));
  })
  /** WebSocket: repassa o upgrade para o Durable Object do restaurante (ADR-0004). */
  .get("/orders/stream", async (c) => {
    if (c.req.header("Upgrade") !== "websocket") return c.text("Expected WebSocket", 426);
    const hub = c.env.ORDERS_HUB.get(c.env.ORDERS_HUB.idFromName(c.var.actor.restaurantId));
    return hub.fetch(c.req.raw);
  })

  // ---- Dashboard (spec 005)
  .get("/dashboard", validate("query", dashboardQuerySchema), async (c) => {
    const dashboard = await c.var.useCases.getDashboard.execute(c.var.actor, c.req.valid("query").period);
    return c.json(dashboard satisfies DashboardDto);
  });
