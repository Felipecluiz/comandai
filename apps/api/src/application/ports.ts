import type { OrderSnapshot } from "../domain";

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

/** Quem está agindo no painel. Sempre derivado do token (constitution II.2). */
export interface Actor {
  ownerId: string;
  restaurantId: string;
}

export interface TokenService {
  sign(actor: Actor): Promise<string>;
  verify(token: string): Promise<Actor | null>;
}

export interface ImageStorage {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Confirma que quem chama é uma pessoa (ADR-0007). Usado em cadastro, login e envio de pedido.
 * Implementações NÃO lançam: qualquer falha (token ausente, rede, configuração) vira `false`.
 */
export interface HumanVerifier {
  verify(token: string, context: { action: string; remoteIp?: string }): Promise<boolean>;
}

export type OrderEvent = { type: "order.created" | "order.updated"; order: OrderSnapshot };

/**
 * Publica eventos para os painéis conectados (ADR-0004).
 * Implementações NÃO devem lançar: falha de notificação não pode desfazer um pedido salvo.
 */
export interface OrderNotifier {
  publish(restaurantId: string, event: OrderEvent): Promise<void>;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface DashboardTotals {
  revenueCents: number;
  orders: number;
  cancelled: number;
}

export interface DailyRevenue {
  date: string;
  revenueCents: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenueCents: number;
}

/** Port de leitura (CQRS leve): agregações direto no banco (BR-005.6). */
export interface DashboardQueries {
  totals(restaurantId: string, range: DateRange): Promise<DashboardTotals>;
  revenueByDay(restaurantId: string, range: DateRange): Promise<DailyRevenue[]>;
  topProducts(restaurantId: string, range: DateRange, limit: number): Promise<TopProduct[]>;
}
