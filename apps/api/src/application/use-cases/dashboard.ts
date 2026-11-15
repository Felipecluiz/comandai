import { addDays, daysBetween, toLocalDate, type RestaurantRepository } from "../../domain";
import type { Actor, Clock, DailyRevenue, DashboardQueries, DateRange, TopProduct } from "../ports";
import { findRestaurantOrFail } from "./accounts";

export type DashboardPeriod = "today" | "7d" | "30d";

const PERIOD_DAYS: Record<DashboardPeriod, number> = { today: 1, "7d": 7, "30d": 30 };
export const TOP_PRODUCTS_LIMIT = 5;

export interface Dashboard extends DateRange {
  period: DashboardPeriod;
  revenueCents: number;
  orders: number;
  averageTicketCents: number;
  cancelled: number;
  revenueByDay: DailyRevenue[];
  topProducts: TopProduct[];
}

export class GetDashboard {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly queries: DashboardQueries,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor, period: DashboardPeriod): Promise<Dashboard> {
    const restaurant = await findRestaurantOrFail(this.restaurants, actor.restaurantId);
    const to = toLocalDate(this.clock.now(), restaurant.timeZone); // BR-005.3
    const range = { from: addDays(to, -(PERIOD_DAYS[period] - 1)), to };

    const [totals, daily, topProducts] = await Promise.all([
      this.queries.totals(restaurant.id, range),
      this.queries.revenueByDay(restaurant.id, range),
      this.queries.topProducts(restaurant.id, range, TOP_PRODUCTS_LIMIT),
    ]);

    return {
      period,
      ...range,
      ...totals,
      averageTicketCents: totals.orders === 0 ? 0 : Math.round(totals.revenueCents / totals.orders), // BR-005.2
      revenueByDay: fillMissingDays(range, daily),
      topProducts,
    };
  }
}

/** BR-005.4 */
function fillMissingDays(range: DateRange, daily: DailyRevenue[]): DailyRevenue[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  return daysBetween(range.from, range.to).map((date) => byDate.get(date) ?? { date, revenueCents: 0, orders: 0 });
}
