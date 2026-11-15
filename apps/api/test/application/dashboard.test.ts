import { describe, expect, it } from "vitest";
import { deliveryOrder, openRestaurantWithMenu } from "../helpers";

describe("GetDashboard (spec 005)", () => {
  it("AC-005.1 ignora cancelados no faturamento e no ticket médio", async () => {
    const sut = await openRestaurantWithMenu();
    const { useCases, actor, slug, calabresa } = sut;
    await useCases.updateRestaurant.execute(actor, { deliveryFeeCents: 0 });
    const cheap = await useCases.catalog.createProduct(actor, {
      categoryId: sut.pizzas.id,
      name: "Broto",
      description: "",
      priceCents: 1000,
      available: true,
    });

    await useCases.placeOrder.execute(slug, deliveryOrder(cheap.id, 5)); // R$ 50
    await useCases.placeOrder.execute(slug, deliveryOrder(cheap.id, 3)); // R$ 30
    const cancelled = await useCases.placeOrder.execute(slug, deliveryOrder(calabresa.id, 2)); // R$ 80
    await useCases.changeOrderStatus.execute(actor, cancelled.order.id, "cancelled", "Endereço fora da área");

    const dashboard = await useCases.getDashboard.execute(actor, "today");
    expect(dashboard).toMatchObject({ revenueCents: 8000, orders: 2, averageTicketCents: 4000, cancelled: 1 });
    expect(dashboard.topProducts[0]).toMatchObject({ name: "Broto", quantity: 8, revenueCents: 8000 });
  });

  it("AC-005.2 série de 7 dias consecutivos terminando hoje", async () => {
    const { useCases, actor } = await openRestaurantWithMenu();
    const { revenueByDay, from, to } = await useCases.getDashboard.execute(actor, "7d");
    expect(revenueByDay.map((d) => d.date)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect([from, to]).toEqual(["2026-11-09", "2026-11-15"]);
  });

  it("AC-005.3 sem pedidos tudo zerado", async () => {
    const { useCases, actor } = await openRestaurantWithMenu();
    const dashboard = await useCases.getDashboard.execute(actor, "30d");
    expect(dashboard).toMatchObject({ revenueCents: 0, orders: 0, averageTicketCents: 0, topProducts: [] });
    expect(dashboard.revenueByDay).toHaveLength(30);
  });
});
