import type {
  AdminCatalogDto,
  CategoryDto,
  OrderDto,
  ProductDto,
  PublicMenuDto,
  RestaurantDto,
} from "@comandai/contracts";
import type { AdminCatalog, PublicMenu } from "../../application";
import {
  allowedTransitions,
  type MenuCategorySnapshot,
  type OrderSnapshot,
  type ProductSnapshot,
  type RestaurantSnapshot,
} from "../../domain";

/** Snapshots do domínio → DTOs públicos. Campos internos (timeZone, localDate…) não vazam. */

export function toRestaurantDto(r: RestaurantSnapshot): RestaurantDto {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    whatsapp: r.whatsapp,
    deliveryFeeCents: r.deliveryFeeCents,
    minOrderCents: r.minOrderCents,
    acceptsDelivery: r.acceptsDelivery,
    acceptsPickup: r.acceptsPickup,
    isOpen: r.isOpen,
  };
}

export const toCategoryDto = ({ id, name, position }: MenuCategorySnapshot): CategoryDto => ({ id, name, position });

export function toProductDto(p: ProductSnapshot, origin: string): ProductDto {
  return {
    id: p.id,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    imageUrl: p.imageKey ? `${origin}/api/images/${p.imageKey}` : null,
    available: p.available,
  };
}

export function toAdminCatalogDto(catalog: AdminCatalog, origin: string): AdminCatalogDto {
  return {
    categories: catalog.categories.map(toCategoryDto),
    products: catalog.products.map((p) => toProductDto(p, origin)),
  };
}

export function toPublicMenuDto({ restaurant: r, sections }: PublicMenu, origin: string): PublicMenuDto {
  return {
    restaurant: {
      slug: r.slug,
      name: r.name,
      isOpen: r.isOpen,
      deliveryFeeCents: r.deliveryFeeCents,
      minOrderCents: r.minOrderCents,
      acceptsDelivery: r.acceptsDelivery,
      acceptsPickup: r.acceptsPickup,
    },
    sections: sections.map((s) => ({ ...toCategoryDto(s), products: s.products.map((p) => toProductDto(p, origin)) })),
  };
}

export function toOrderDto(o: OrderSnapshot): OrderDto {
  const { restaurantId: _r, localDate: _d, ...dto } = o;
  return { ...dto, allowedTransitions: allowedTransitions(o.status, o.fulfillment.type) };
}
