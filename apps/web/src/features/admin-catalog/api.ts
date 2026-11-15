import type { AdminCatalogDto, CategoryDto, ProductDto, ProductInput, UpdateProductInput } from "@comandai/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../shared/api/http";

const catalogKey = ["admin-catalog"] as const;

export function useCatalog() {
  return useQuery({ queryKey: catalogKey, queryFn: () => adminApi.get<AdminCatalogDto>("/catalog") });
}

function useCatalogMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKey }),
  });
}

export const useCreateCategory = () =>
  useCatalogMutation((name: string) => adminApi.post<CategoryDto>("/categories", { name }));

export const useRenameCategory = () =>
  useCatalogMutation(({ id, name }: { id: string; name: string }) => adminApi.patch<CategoryDto>(`/categories/${id}`, { name }));

export const useDeleteCategory = () => useCatalogMutation((id: string) => adminApi.delete(`/categories/${id}`));

export const useReorderCategories = () =>
  useCatalogMutation((ids: string[]) => adminApi.put<CategoryDto[]>("/categories/order", { ids }));

export const useSaveProduct = () =>
  useCatalogMutation(({ id, input }: { id?: string; input: ProductInput | UpdateProductInput }) =>
    id ? adminApi.patch<ProductDto>(`/products/${id}`, input) : adminApi.post<ProductDto>("/products", input),
  );

export const useDeleteProduct = () => useCatalogMutation((id: string) => adminApi.delete(`/products/${id}`));

export const useUploadImage = () =>
  useCatalogMutation(({ id, file }: { id: string; file: File }) => {
    const form = new FormData();
    form.set("image", file);
    return adminApi.put<ProductDto>(`/products/${id}/image`, form);
  });
