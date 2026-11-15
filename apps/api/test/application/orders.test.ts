import { describe, expect, it } from "vitest";
import { InvalidStatusTransitionError, NotFoundError, ProductUnavailableError } from "../../src/domain";
import { deliveryOrder, openRestaurantWithMenu } from "../helpers";

describe("PlaceOrder (spec 003)", () => {
  it("AC-003.1 salva o pedido pendente com total calculado", async () => {
    const { useCases, slug, calabresa, store } = await openRestaurantWithMenu();
    const { order } = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    expect(order).toMatchObject({ status: "pending", totalCents: 8500 });
    expect(store.orders.has(order.id)).toBe(true); // US-003.4: está no painel mesmo sem WhatsApp
  });

  it("AC-003.7 numera pedidos em sequência por restaurante", async () => {
    const { useCases, slug, calabresa } = await openRestaurantWithMenu();
    const first = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    const second = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    expect([first.order.number, second.order.number]).toEqual([1, 2]);
  });

  it("pedido inválido não consome número da sequência", async () => {
    const { useCases, slug, calabresa } = await openRestaurantWithMenu();
    await expect(useCases.placeOrder.execute(slug, deliveryOrder("nao-existe"))).rejects.toThrow(
      ProductUnavailableError,
    );
    const { order } = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    expect(order.number).toBe(1);
  });

  it("AC-003.8 devolve link wa.me para o WhatsApp do restaurante", async () => {
    const { useCases, slug, calabresa } = await openRestaurantWithMenu();
    const { whatsappUrl } = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    const url = new URL(whatsappUrl);
    expect(url.origin + url.pathname).toBe("https://wa.me/5511987654321");
    expect(url.searchParams.get("text")).toContain("*Novo pedido #1*");
  });

  it("BR-004.4 publica order.created para o painel do restaurante", async () => {
    const { useCases, slug, calabresa, notifier, actor } = await openRestaurantWithMenu();
    await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    expect(notifier.events).toHaveLength(1);
    expect(notifier.events[0]).toMatchObject({ restaurantId: actor.restaurantId, event: { type: "order.created" } });
  });

  it("restaurante inexistente dá 404", async () => {
    const { useCases, calabresa } = await openRestaurantWithMenu();
    await expect(useCases.placeOrder.execute("nao-existe", deliveryOrder(calabresa.id))).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("Painel de pedidos (spec 004)", () => {
  it("avança o pedido e publica order.updated", async () => {
    const { useCases, slug, calabresa, actor, notifier } = await openRestaurantWithMenu();
    const { order } = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));

    const updated = await useCases.changeOrderStatus.execute(actor, order.id, "accepted");
    expect(updated.status).toBe("accepted");
    expect(notifier.events.at(-1)?.event.type).toBe("order.updated");
  });

  it("AC-004.1 transição inválida é rejeitada", async () => {
    const { useCases, slug, calabresa, actor } = await openRestaurantWithMenu();
    const { order } = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    await expect(useCases.changeOrderStatus.execute(actor, order.id, "completed")).rejects.toThrow(
      InvalidStatusTransitionError,
    );
  });

  it("AC-004.5 outro restaurante não enxerga o pedido", async () => {
    const { useCases, slug, calabresa } = await openRestaurantWithMenu();
    const { order } = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    const intruder = { ownerId: "x", restaurantId: "outro" };
    await expect(useCases.changeOrderStatus.execute(intruder, order.id, "accepted")).rejects.toThrow(NotFoundError);
  });

  it("BR-004.5 'active' lista só pedidos abertos", async () => {
    const { useCases, slug, calabresa, actor } = await openRestaurantWithMenu();
    const a = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id));
    await useCases.changeOrderStatus.execute(actor, a.order.id, "cancelled", "Sem entregador");

    const active = await useCases.listOrders.execute(actor, "active");
    const recent = await useCases.listOrders.execute(actor, "recent");
    expect(active).toHaveLength(1);
    expect(recent).toHaveLength(2);
  });
});
