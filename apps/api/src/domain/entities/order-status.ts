export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type FulfillmentType = "delivery" | "pickup";

/** BR-004.1 — a máquina de estados inteira cabe nesta tabela. */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "completed"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};

export const OPEN_STATUSES: readonly OrderStatus[] = ["pending", "accepted", "preparing", "ready", "out_for_delivery"];

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: FulfillmentType): boolean {
  if (!TRANSITIONS[from].includes(to)) return false;
  if (to === "out_for_delivery" && fulfillment !== "delivery") return false;
  if (from === "ready" && to === "completed" && fulfillment === "delivery") return false;
  return true;
}

export function allowedTransitions(from: OrderStatus, fulfillment: FulfillmentType): OrderStatus[] {
  return TRANSITIONS[from].filter((to) => canTransition(from, to, fulfillment));
}

/** Próximo passo "feliz" — usado pelo botão principal do kanban. */
export function nextStatus(from: OrderStatus, fulfillment: FulfillmentType): OrderStatus | null {
  return TRANSITIONS[from].find((to) => to !== "cancelled" && canTransition(from, to, fulfillment)) ?? null;
}
