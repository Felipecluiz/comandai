import type { ChangeOrderStatusInput, OrderDto } from "@comandai/contracts";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { adminApi } from "../../shared/api/http";

export const ordersKey = ["admin-orders"] as const;

export function useOrders() {
  return useQuery({
    queryKey: ordersKey,
    queryFn: () => adminApi.get<OrderDto[]>("/orders", { scope: "recent" }),
    refetchInterval: 60_000, // rede de segurança caso o WebSocket caia sem perceber
  });
}

/** Insere/atualiza um pedido no cache sem refazer a busca (usado pelo WebSocket e pelas mutações). */
export function upsertOrderInCache(queryClient: QueryClient, order: OrderDto): void {
  queryClient.setQueryData<OrderDto[]>(ordersKey, (current = []) => {
    const others = current.filter((o) => o.id !== order.id);
    return [order, ...others].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export function useChangeOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ChangeOrderStatusInput & { id: string }) =>
      adminApi.patch<OrderDto>(`/orders/${id}/status`, input),
    onSuccess: (order) => upsertOrderInCache(queryClient, order),
  });
}
