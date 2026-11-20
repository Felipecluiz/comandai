import type { PlaceOrderInput, PlaceOrderResultDto, PublicMenuDto } from "@comandai/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { humanHeaders, publicApi } from "../../shared/api/http";

export function usePublicMenu(slug: string) {
  return useQuery({
    queryKey: ["public-menu", slug],
    queryFn: () => publicApi.get<PublicMenuDto>(`/public/${slug}/menu`),
    staleTime: 30_000,
  });
}

export function usePlaceOrder(slug: string) {
  return useMutation({
    mutationFn: ({ input, humanToken }: { input: PlaceOrderInput; humanToken: string }) =>
      publicApi.post<PlaceOrderResultDto>(`/public/${slug}/orders`, input, humanHeaders(humanToken)),
  });
}
