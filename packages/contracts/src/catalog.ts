import { z } from "zod";
import { idSchema } from "./common";

export const MAX_PRODUCT_PRICE_CENTS = 1_000_000;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const categoryInputSchema = z.object({ name: z.string().trim().min(2).max(40) });
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const reorderCategoriesInputSchema = z.object({ ids: z.array(idSchema).min(1).max(100) });

export const productInputSchema = z.object({
  categoryId: idSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  priceCents: z.number().int().positive("Preço deve ser maior que zero").max(MAX_PRODUCT_PRICE_CENTS),
  available: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const updateProductInputSchema = productInputSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

export interface CategoryDto {
  id: string;
  name: string;
  position: number;
}

export interface ProductDto {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
}

export interface AdminCatalogDto {
  categories: CategoryDto[];
  products: ProductDto[];
}

export interface PublicMenuDto {
  restaurant: {
    slug: string;
    name: string;
    isOpen: boolean;
    deliveryFeeCents: number;
    minOrderCents: number;
    acceptsDelivery: boolean;
    acceptsPickup: boolean;
  };
  sections: Array<CategoryDto & { products: ProductDto[] }>;
}
