import {
  NotFoundError,
  OPEN_STATUSES,
  Order,
  buildWhatsAppUrl,
  formatOrderMessage,
  type CatalogRepository,
  type OrderRepository,
  type OrderSnapshot,
  type OrderStatus,
  type PlaceOrderRequest,
  type RestaurantRepository,
} from "../../domain";
import type { Actor, Clock, IdGenerator, OrderNotifier } from "../ports";

export interface PlaceOrderResult {
  order: OrderSnapshot;
  whatsappUrl: string;
}

/** Spec 003 — salva o pedido, avisa o painel e devolve o link do WhatsApp. */
export class PlaceOrder {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly catalog: CatalogRepository,
    private readonly orders: OrderRepository,
    private readonly notifier: OrderNotifier,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(slug: string, request: PlaceOrderRequest): Promise<PlaceOrderResult> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant) throw new NotFoundError("Restaurante");

    const productIds = [...new Set(request.items.map((i) => i.productId))];
    const products = await this.catalog.findProductsByIds(restaurant.id, productIds);

    // Valida antes de consumir um número sequencial; o número entra só na criação final.
    const draftContext = { id: "draft", number: 0, restaurant, products, now: this.clock.now() };
    Order.place(request, draftContext);

    const order = Order.place(request, {
      ...draftContext,
      id: this.ids.next(),
      number: await this.orders.nextNumber(restaurant.id),
    });
    await this.orders.save(order);

    const snapshot = order.toSnapshot();
    await this.notifier.publish(restaurant.id, { type: "order.created", order: snapshot });

    const message = formatOrderMessage(snapshot, restaurant.name);
    return { order: snapshot, whatsappUrl: buildWhatsAppUrl(restaurant.whatsapp, message) };
  }
}

export type OrderScope = "active" | "recent";
const DAY_MS = 24 * 60 * 60 * 1000;

export class ListOrders {
  constructor(
    private readonly orders: OrderRepository,
    private readonly clock: Clock,
  ) {}

  /** BR-004.5 — abertos (qualquer data) ou tudo das últimas 24h. */
  async execute({ restaurantId }: Actor, scope: OrderScope): Promise<OrderSnapshot[]> {
    const filter =
      scope === "active"
        ? { statuses: OPEN_STATUSES }
        : { createdSince: new Date(this.clock.now().getTime() - DAY_MS).toISOString() };

    const [listed, open] = await Promise.all([
      this.orders.list(restaurantId, filter),
      scope === "recent" ? this.orders.list(restaurantId, { statuses: OPEN_STATUSES }) : Promise.resolve([]),
    ]);

    const unique = new Map([...open, ...listed].map((o) => [o.id, o.toSnapshot()]));
    return [...unique.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class ChangeOrderStatus {
  constructor(
    private readonly orders: OrderRepository,
    private readonly notifier: OrderNotifier,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor, orderId: string, status: OrderStatus, reason?: string): Promise<OrderSnapshot> {
    const order = await this.orders.findById(actor.restaurantId, orderId); // AC-004.5
    if (!order) throw new NotFoundError("Pedido");

    order.changeStatus(status, this.clock.now(), reason);
    await this.orders.save(order);

    const snapshot = order.toSnapshot();
    await this.notifier.publish(actor.restaurantId, { type: "order.updated", order: snapshot });
    return snapshot;
  }
}
