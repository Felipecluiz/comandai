import type {
  DailyRevenue,
  DashboardQueries,
  DashboardTotals,
  DateRange,
  TopProduct,
} from "../../application";

/** Agregações no SQLite do D1 (BR-005.6). Cancelados ficam fora da receita (BR-005.1). */
export class D1DashboardQueries implements DashboardQueries {
  constructor(private readonly db: D1Database) {}

  async totals(restaurantId: string, { from, to }: DateRange): Promise<DashboardTotals> {
    const row = await this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN total_cents END), 0) AS revenueCents,
           COUNT(CASE WHEN status <> 'cancelled' THEN 1 END)                    AS orders,
           COUNT(CASE WHEN status =  'cancelled' THEN 1 END)                    AS cancelled
         FROM orders
         WHERE restaurant_id = ? AND local_date BETWEEN ? AND ?`,
      )
      .bind(restaurantId, from, to)
      .first<DashboardTotals>();
    return row ?? { revenueCents: 0, orders: 0, cancelled: 0 };
  }

  async revenueByDay(restaurantId: string, { from, to }: DateRange): Promise<DailyRevenue[]> {
    const { results } = await this.db
      .prepare(
        `SELECT local_date AS date, SUM(total_cents) AS revenueCents, COUNT(*) AS orders
         FROM orders
         WHERE restaurant_id = ? AND local_date BETWEEN ? AND ? AND status <> 'cancelled'
         GROUP BY local_date
         ORDER BY local_date`,
      )
      .bind(restaurantId, from, to)
      .all<DailyRevenue>();
    return results;
  }

  async topProducts(restaurantId: string, { from, to }: DateRange, limit: number): Promise<TopProduct[]> {
    const { results } = await this.db
      .prepare(
        `SELECT i.product_id AS productId, MAX(i.name) AS name,
                SUM(i.quantity) AS quantity, SUM(i.total_cents) AS revenueCents
         FROM order_items i
         JOIN orders o ON o.id = i.order_id
         WHERE o.restaurant_id = ? AND o.local_date BETWEEN ? AND ? AND o.status <> 'cancelled'
         GROUP BY i.product_id
         ORDER BY quantity DESC, revenueCents DESC
         LIMIT ?`,
      )
      .bind(restaurantId, from, to, limit)
      .all<TopProduct>();
    return results;
  }
}
