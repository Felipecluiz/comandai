import { z } from "zod";

export const dashboardQuerySchema = z.object({ period: z.enum(["today", "7d", "30d"]).default("7d") });
export type DashboardPeriod = z.infer<typeof dashboardQuerySchema>["period"];

export interface DashboardDto {
  period: DashboardPeriod;
  from: string;
  to: string;
  revenueCents: number;
  orders: number;
  averageTicketCents: number;
  cancelled: number;
  revenueByDay: Array<{ date: string; revenueCents: number; orders: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenueCents: number }>;
}
