import { describe, expect, it } from "vitest";
import {
  InvalidStatusTransitionError,
  MinOrderNotReachedError,
  Order,
  Product,
  ProductUnavailableError,
  Restaurant,
  RestaurantClosedError,
  ValidationError,
  allowedTransitions,
  formatOrderMessage,
  nextStatus,
} from "../../src/domain";

const now = new Date("2026-11-15T15:00:00.000Z");

function restaurant(overrides: Parameters<Restaurant["update"]>[0] = {}) {
  const r = Restaurant.create({ id: "r1", name: "Pizzaria do Zé", slug: "pizzaria-do-ze", whatsapp: "11987654321" }, now);
  r.update({ isOpen: true, deliveryFeeCents: 500, ...overrides });
  return r;
}

const pizza = Product.create({
  id: "p1",
  restaurantId: "r1",
  categoryId: "c1",
  name: "Calabresa",
  description: "",
  priceCents: 4000,
  available: true,
});

const request = (overrides: Record<string, unknown> = {}) => ({
  customer: { name: "Maria", phone: "11912345678" },
  fulfillment: { type: "delivery", address: { street: "Rua A", number: "1", district: "Centro" } },
  payment: { method: "pix" },
  items: [{ productId: "p1", quantity: 2 }],
  ...overrides,
});

const place = (req = request(), r = restaurant(), products = [pizza]) =>
  Order.place(req, { id: "o1", number: 1, restaurant: r, products, now });

describe("Order.place (spec 003)", () => {
  it("AC-003.1 calcula subtotal, taxa de entrega e total", () => {
    const order = place().toSnapshot();
    expect(order).toMatchObject({ subtotalCents: 8000, deliveryFeeCents: 500, totalCents: 8500, status: "pending" });
  });

  it("AC-003.2 ignora preço enviado pelo cliente", () => {
    const tampered = request({ items: [{ productId: "p1", quantity: 1, priceCents: 1 }] });
    expect(place(tampered).toSnapshot().items[0]?.unitPriceCents).toBe(4000);
  });

  it("retirada não cobra taxa de entrega", () => {
    expect(place(request({ fulfillment: { type: "pickup" } })).toSnapshot().totalCents).toBe(8000);
  });

  it("AC-003.3 rejeita produto pausado ou de outro restaurante", () => {
    const paused = Product.restore({ ...pizza.toSnapshot(), available: false });
    expect(() => place(request(), restaurant(), [paused])).toThrow(ProductUnavailableError);

    const foreign = Product.restore({ ...pizza.toSnapshot(), restaurantId: "outro" });
    expect(() => place(request(), restaurant(), [foreign])).toThrow(ProductUnavailableError);
  });

  it("AC-003.4 rejeita pedido com loja fechada", () => {
    expect(() => place(request(), restaurant({ isOpen: false }))).toThrow(RestaurantClosedError);
  });

  it("AC-003.5 exige pedido mínimo sobre o subtotal", () => {
    const req = request({ items: [{ productId: "p1", quantity: 1 }] });
    expect(() => place(req, restaurant({ minOrderCents: 5000 }))).toThrow(MinOrderNotReachedError);
  });

  it("AC-003.6 entrega exige endereço", () => {
    expect(() => place(request({ fulfillment: { type: "delivery" } }))).toThrow(ValidationError);
  });

  it("BR-003.3 recusa modo desabilitado pelo restaurante", () => {
    const r = restaurant({ acceptsDelivery: false });
    expect(() => place(request(), r)).toThrow(ValidationError);
  });

  it("AC-003.9 troco deve ser maior ou igual ao total", () => {
    expect(() => place(request({ payment: { method: "cash", changeForCents: 5000 } }))).toThrow(ValidationError);
    const ok = place(request({ payment: { method: "cash", changeForCents: 10000 } })).toSnapshot();
    expect(ok.payment).toEqual({ method: "cash", changeForCents: 10000 });
  });

  it("BR-003.5 limita quantidade por item", () => {
    expect(() => place(request({ items: [{ productId: "p1", quantity: 51 }] }))).toThrow(ValidationError);
  });

  it("guarda o dia local do pedido para o dashboard", () => {
    expect(place().toSnapshot().localDate).toBe("2026-11-15");
  });
});

describe("Order.changeStatus (spec 004)", () => {
  it("segue o fluxo feliz de uma entrega", () => {
    const order = place();
    for (const status of ["accepted", "preparing", "ready", "out_for_delivery", "completed"] as const) {
      order.changeStatus(status, now);
    }
    expect(order.toSnapshot().statusHistory.map((h) => h.status)).toEqual([
      "pending",
      "accepted",
      "preparing",
      "ready",
      "out_for_delivery",
      "completed",
    ]);
  });

  it("AC-004.1 não pula etapas", () => {
    expect(() => place().changeStatus("ready", now)).toThrow(InvalidStatusTransitionError);
  });

  it("AC-004.2 retirada não sai para entrega", () => {
    const order = place(request({ fulfillment: { type: "pickup" } }));
    order.changeStatus("accepted", now);
    order.changeStatus("preparing", now);
    order.changeStatus("ready", now);
    expect(() => order.changeStatus("out_for_delivery", now)).toThrow(InvalidStatusTransitionError);
    order.changeStatus("completed", now);
    expect(order.status).toBe("completed");
  });

  it("AC-004.3 cancelamento exige motivo", () => {
    expect(() => place().changeStatus("cancelled", now)).toThrow(ValidationError);
    const order = place();
    order.changeStatus("cancelled", now, "Cliente desistiu");
    expect(order.toSnapshot().cancelReason).toBe("Cliente desistiu");
  });

  it("nextStatus sugere o próximo passo conforme o tipo de pedido", () => {
    expect(nextStatus("ready", "delivery")).toBe("out_for_delivery");
    expect(nextStatus("ready", "pickup")).toBe("completed");
    expect(nextStatus("completed", "pickup")).toBe(null);
  });

  it("allowedTransitions expõe as ações válidas para o painel", () => {
    expect(allowedTransitions("pending", "delivery")).toEqual(["accepted", "cancelled"]);
    expect(allowedTransitions("ready", "delivery")).toEqual(["out_for_delivery"]);
    expect(allowedTransitions("ready", "pickup")).toEqual(["completed"]);
  });
});

describe("formatOrderMessage (BR-003.8)", () => {
  it("monta a mensagem com itens, totais, endereço, pagamento e cliente", () => {
    const req = request({
      items: [{ productId: "p1", quantity: 2, notes: "Sem cebola" }],
      payment: { method: "cash", changeForCents: 10000 },
    });
    const message = formatOrderMessage(place(req).toSnapshot(), "Pizzaria do Zé");

    expect(message).toBe(
      [
        "*Novo pedido #1* — Pizzaria do Zé",
        "",
        "2x Calabresa — R$ 80,00",
        "   _Obs: Sem cebola_",
        "",
        "Subtotal: R$ 80,00",
        "Entrega: R$ 5,00",
        "*Total: R$ 85,00*",
        "",
        "📍 *Entrega*",
        "Rua A, 1",
        "Centro",
        "",
        "💳 Dinheiro",
        "Troco para R$ 100,00",
        "",
        "👤 Maria · (11) 91234-5678",
      ].join("\n"),
    );
  });
});
