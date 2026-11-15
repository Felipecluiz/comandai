import { Order, type OrderItem, type OrderListFilter, type OrderRepository, type OrderSnapshot } from "../../domain";

interface OrderRow {
  id: string;
  restaurant_id: string;
  number: number;
  status: OrderSnapshot["status"];
  customer_json: string;
  fulfillment_json: string;
  payment_json: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  cancel_reason: string | null;
  status_history_json: string;
  created_at: string;
  local_date: string;
}

interface ItemRow {
  order_id: string;
  product_id: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
  notes: string;
  total_cents: number;
}

const toItem = (r: ItemRow): OrderItem => ({
  productId: r.product_id,
  name: r.name,
  unitPriceCents: r.unit_price_cents,
  quantity: r.quantity,
  notes: r.notes,
  totalCents: r.total_cents,
});

function toOrder(row: OrderRow, items: OrderItem[]): Order {
  return Order.restore({
    id: row.id,
    restaurantId: row.restaurant_id,
    number: row.number,
    status: row.status,
    customer: JSON.parse(row.customer_json),
    fulfillment: JSON.parse(row.fulfillment_json),
    payment: JSON.parse(row.payment_json),
    items,
    subtotalCents: row.subtotal_cents,
    deliveryFeeCents: row.delivery_fee_cents,
    totalCents: row.total_cents,
    cancelReason: row.cancel_reason ?? undefined,
    statusHistory: JSON.parse(row.status_history_json),
    createdAt: row.created_at,
    localDate: row.local_date,
  });
}

export class D1OrderRepository implements OrderRepository {
  constructor(private readonly db: D1Database) {}

  /** Incremento atômico: duas requisições simultâneas nunca recebem o mesmo número (BR-003.7). */
  async nextNumber(restaurantId: string): Promise<number> {
    const row = await this.db
      .prepare("UPDATE restaurants SET order_seq = order_seq + 1 WHERE id = ? RETURNING order_seq")
      .bind(restaurantId)
      .first<{ order_seq: number }>();
    if (!row) throw new Error(`Restaurant ${restaurantId} not found while numbering order`);
    return row.order_seq;
  }

  async save(order: Order): Promise<void> {
    const s = order.toSnapshot();
    const upsert = this.db
      .prepare(
        `INSERT INTO orders (id, restaurant_id, number, status, customer_json, fulfillment_type, fulfillment_json,
           payment_json, subtotal_cents, delivery_fee_cents, total_cents, cancel_reason, status_history_json,
           created_at, local_date)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
         ON CONFLICT (id) DO UPDATE SET
           status = excluded.status, cancel_reason = excluded.cancel_reason,
           status_history_json = excluded.status_history_json`,
      )
      .bind(
        s.id,
        s.restaurantId,
        s.number,
        s.status,
        JSON.stringify(s.customer),
        s.fulfillment.type,
        JSON.stringify(s.fulfillment),
        JSON.stringify(s.payment),
        s.subtotalCents,
        s.deliveryFeeCents,
        s.totalCents,
        s.cancelReason ?? null,
        JSON.stringify(s.statusHistory),
        s.createdAt,
        s.localDate,
      );

    // Itens são imutáveis (snapshot): inseridos uma vez, ignorados nas atualizações de status.
    const items = s.items.map((item, position) =>
      this.db
        .prepare(
          `INSERT OR IGNORE INTO order_items
             (order_id, position, product_id, name, unit_price_cents, quantity, notes, total_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(s.id, position, item.productId, item.name, item.unitPriceCents, item.quantity, item.notes, item.totalCents),
    );

    await this.db.batch([upsert, ...items]);
  }

  async findById(restaurantId: string, id: string): Promise<Order | null> {
    const row = await this.db
      .prepare("SELECT * FROM orders WHERE restaurant_id = ? AND id = ?")
      .bind(restaurantId, id)
      .first<OrderRow>();
    if (!row) return null;
    const [order] = await this.withItems([row]);
    return order ?? null;
  }

  async list(restaurantId: string, { statuses, createdSince }: OrderListFilter): Promise<Order[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM orders
         WHERE restaurant_id = ?1
           AND (?2 IS NULL OR status IN (SELECT value FROM json_each(?2)))
           AND (?3 IS NULL OR created_at >= ?3)
         ORDER BY created_at DESC
         LIMIT 200`,
      )
      .bind(restaurantId, statuses ? JSON.stringify(statuses) : null, createdSince ?? null)
      .all<OrderRow>();
    return this.withItems(results);
  }

  /** Uma query para todos os itens — evita N+1. */
  private async withItems(rows: OrderRow[]): Promise<Order[]> {
    if (rows.length === 0) return [];
    const { results } = await this.db
      .prepare(
        "SELECT * FROM order_items WHERE order_id IN (SELECT value FROM json_each(?)) ORDER BY order_id, position",
      )
      .bind(JSON.stringify(rows.map((r) => r.id)))
      .all<ItemRow>();

    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const item of results) {
      itemsByOrder.set(item.order_id, [...(itemsByOrder.get(item.order_id) ?? []), toItem(item)]);
    }
    return rows.map((row) => toOrder(row, itemsByOrder.get(row.id) ?? []));
  }
}
