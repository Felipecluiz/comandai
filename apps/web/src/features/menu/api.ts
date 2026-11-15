import type { PlaceOrderInput, PlaceOrderResultDto, PublicMenuDto } from "@comandai/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { publicApi } from "../../shared/api/http";

export function usePublicMenu(slug: string) {
  return useQuery({
    queryKey: ["public-menu", slug],
    queryFn: () => publicApi.get<PublicMenuDto>(`/public/${slug}/menu`),
    staleTime: 30_000,
  });
}

export function usePlaceOrder(slug: string) {
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => publicApi.post<PlaceOrderResultDto>(`/public/${slug}/orders`, input),
  });
}
