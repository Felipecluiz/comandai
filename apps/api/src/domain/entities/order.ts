import {
  InvalidStatusTransitionError,
  MinOrderNotReachedError,
  ProductUnavailableError,
  RestaurantClosedError,
  ValidationError,
} from "../errors/domain-error";
import { toLocalDate } from "../value-objects/local-date";
import { Money } from "../value-objects/money";
import { Phone } from "../value-objects/phone";
import { boundedText } from "../value-objects/text";
import type { Product } from "./catalog";
import { canTransition, type FulfillmentType, type OrderStatus } from "./order-status";
import type { Restaurant } from "./restaurant";

export const MAX_ORDER_LINES = 30;
export const MAX_LINE_QUANTITY = 50;

export type PaymentMethod = "pix" | "card" | "cash";

export interface Address {
  street: string;
  number: string;
  district: string;
  complement: string;
  reference: string;
}

export type Fulfillment = { type: "delivery"; address: Address } | { type: "pickup" };

export interface OrderLineRequest {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface PlaceOrderRequest {
  customer: { name: string; phone: string };
  fulfillment: { type: string; address?: Partial<Address> };
  payment: { method: string; changeForCents?: number };
  items: OrderLineRequest[];
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
  totalCents: number;
}

export interface OrderSnapshot {
  id: string;
  restaurantId: string;
  number: number;
  status: OrderStatus;
  customer: { name: string; phone: string };
  fulfillment: Fulfillment;
  payment: { method: PaymentMethod; changeForCents?: number };
  items: OrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  cancelReason?: string;
  statusHistory: Array<{ status: OrderStatus; at: string }>;
  createdAt: string;
  /** Dia do pedido no fuso do restaurante — base do dashboard (BR-005.3). */
  localDate: string;
}

export interface PlaceOrderContext {
  id: string;
  number: number;
  restaurant: Restaurant;
  /** Produtos carregados do banco para os ids pedidos (BR-003.1). */
  products: Product[];
  now: Date;
}

export class Order {
  private constructor(private state: OrderSnapshot) {}

  /** Cria o pedido aplicando BR-003.1 … BR-003.6. Nada do request é confiado além de ids/quantidades. */
  static place(request: PlaceOrderRequest, ctx: PlaceOrderContext): Order {
    const { restaurant } = ctx;
    if (!restaurant.isOpen) throw new RestaurantClosedError(); // BR-003.2

    const fulfillment = parseFulfillment(request.fulfillment, restaurant);
    const items = priceItems(request.items, ctx.products, restaurant.id);
    const subtotal = items.reduce((sum, i) => sum.add(Money.of(i.totalCents)), Money.ZERO);
    if (subtotal.isLessThan(restaurant.minOrder)) throw new MinOrderNotReachedError(restaurant.minOrder.cents);

    const deliveryFee = fulfillment.type === "delivery" ? restaurant.deliveryFee : Money.ZERO;
    const total = subtotal.add(deliveryFee);

    return new Order({
      id: ctx.id,
      restaurantId: restaurant.id,
      number: ctx.number,
      status: "pending",
      customer: {
        name: boundedText(request.customer.name, { field: "customer.name", min: 2, max: 60 }),
        phone: Phone.create(request.customer.phone, "customer.phone").digits,
      },
      fulfillment,
      payment: parsePayment(request.payment, total),
      items,
      subtotalCents: subtotal.cents,
      deliveryFeeCents: deliveryFee.cents,
      totalCents: total.cents,
      statusHistory: [{ status: "pending", at: ctx.now.toISOString() }],
      createdAt: ctx.now.toISOString(),
      localDate: toLocalDate(ctx.now, restaurant.timeZone),
    });
  }

  static restore(snapshot: OrderSnapshot): Order {
    return new Order(structuredClone(snapshot));
  }

  get id(): string {
    return this.state.id;
  }
  get status(): OrderStatus {
    return this.state.status;
  }

  /** BR-004.1 … BR-004.3 */
  changeStatus(next: OrderStatus, now: Date, reason?: string): void {
    const { status, fulfillment } = this.state;
    if (!canTransition(status, next, fulfillment.type)) throw new InvalidStatusTransitionError(status, next);

    if (next === "cancelled") {
      this.state.cancelReason = boundedText(reason ?? "", { field: "reason", min: 3, max: 140 });
    }
    this.state.status = next;
    this.state.statusHistory.push({ status: next, at: now.toISOString() });
  }

  toSnapshot(): OrderSnapshot {
    return structuredClone(this.state);
  }
}

function parseFulfillment(input: PlaceOrderRequest["fulfillment"], restaurant: Restaurant): Fulfillment {
  if (input.type !== "delivery" && input.type !== "pickup") {
    throw new ValidationError("fulfillment.type", "Escolha entrega ou retirada");
  }
  const type: FulfillmentType = input.type;
  if (!restaurant.accepts(type)) {
    throw new ValidationError("fulfillment.type", type === "delivery" ? "Não fazemos entregas" : "Não aceitamos retirada");
  }
  if (type === "pickup") return { type };

  const a = input.address;
  if (!a) throw new ValidationError("fulfillment.address", "Informe o endereço de entrega"); // BR-003.3
  return {
    type,
    address: {
      street: boundedText(a.street ?? "", { field: "address.street", min: 3, max: 120 }),
      number: boundedText(a.number ?? "", { field: "address.number", min: 1, max: 10 }),
      district: boundedText(a.district ?? "", { field: "address.district", min: 2, max: 60 }),
      complement: boundedText(a.complement ?? "", { field: "address.complement", min: 0, max: 60 }),
      reference: boundedText(a.reference ?? "", { field: "address.reference", min: 0, max: 100 }),
    },
  };
}

function priceItems(lines: OrderLineRequest[], products: Product[], restaurantId: string): OrderItem[] {
  if (lines.length === 0) throw new ValidationError("items", "Carrinho vazio");
  if (lines.length > MAX_ORDER_LINES) throw new ValidationError("items", `Máximo ${MAX_ORDER_LINES} itens`); // BR-003.5

  const catalog = new Map(products.map((p) => [p.id, p]));
  return lines.map((line) => {
    const product = catalog.get(line.productId);
    if (!product || product.restaurantId !== restaurantId || !product.isAvailable) {
      throw new ProductUnavailableError(line.productId);
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_LINE_QUANTITY) {
      throw new ValidationError("items.quantity", `Quantidade de 1 a ${MAX_LINE_QUANTITY}`);
    }
    return {
      productId: product.id,
      name: product.name,
      unitPriceCents: product.price.cents,
      quantity: line.quantity,
      notes: boundedText(line.notes ?? "", { field: "items.notes", min: 0, max: 140 }),
      totalCents: product.price.times(line.quantity).cents,
    };
  });
}

function parsePayment(input: PlaceOrderRequest["payment"], total: Money): OrderSnapshot["payment"] {
  const method = input.method;
  if (method !== "pix" && method !== "card" && method !== "cash") {
    throw new ValidationError("payment.method", "Forma de pagamento inválida");
  }
  if (method !== "cash" || input.changeForCents === undefined) return { method };

  const changeFor = Money.of(input.changeForCents, "payment.changeForCents");
  if (changeFor.isLessThan(total)) {
    throw new ValidationError("payment.changeForCents", "O troco deve ser para um valor maior que o total"); // BR-003.6
  }
  return { method, changeForCents: changeFor.cents };
}
