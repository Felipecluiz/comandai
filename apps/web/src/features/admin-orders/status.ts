import type { OrderDto, OrderStatusDto } from "@comandai/contracts";

export const STATUS_LABEL: Record<OrderStatusDto, string> = {
  pending: "Novo",
  accepted: "Aceito",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

/** Texto do botão que leva AO status indicado. */
export const ACTION_LABEL: Partial<Record<OrderStatusDto, string>> = {
  accepted: "Aceitar",
  preparing: "Iniciar preparo",
  ready: "Marcar como pronto",
  out_for_delivery: "Saiu para entrega",
  completed: "Concluir",
};

export interface BoardColumn {
  id: string;
  title: string;
  statuses: OrderStatusDto[];
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: "new", title: "Novos", statuses: ["pending"] },
  { id: "kitchen", title: "Na cozinha", statuses: ["accepted", "preparing"] },
  { id: "ready", title: "Prontos / em rota", statuses: ["ready", "out_for_delivery"] },
  { id: "done", title: "Finalizados (24h)", statuses: ["completed", "cancelled"] },
];

/** A ação principal é a primeira transição permitida que não seja cancelar — a regra vem da API. */
export function primaryAction(order: OrderDto): OrderStatusDto | undefined {
  return order.allowedTransitions.find((s) => s !== "cancelled");
}
