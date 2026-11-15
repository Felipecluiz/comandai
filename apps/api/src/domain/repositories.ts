import type { MenuCategory, Product } from "./entities/catalog";
import type { Order } from "./entities/order";
import type { OrderStatus } from "./entities/order-status";
import type { Owner } from "./entities/owner";
import type { Restaurant } from "./entities/restaurant";

/** Ports de persistência. Toda operação administrativa exige o tenant (ADR-0002). */

export interface AccountRepository {
  findOwnerByEmail(email: string): Promise<Owner | null>;
  slugExists(slug: string): Promise<boolean>;
  /** Cria restaurante + dono atomicamente. */
  createAccount(restaurant: Restaurant, owner: Owner): Promise<void>;
}

export interface RestaurantRepository {
  findById(id: string): Promise<Restaurant | null>;
  findBySlug(slug: string): Promise<Restaurant | null>;
  save(restaurant: Restaurant): Promise<void>;
}

export interface CatalogRepository {
  listCategories(restaurantId: string): Promise<MenuCategory[]>;
  findCategory(restaurantId: string, id: string): Promise<MenuCategory | null>;
  findCategoryByName(restaurantId: string, normalizedName: string): Promise<MenuCategory | null>;
  saveCategory(category: MenuCategory): Promise<void>;
  saveCategories(categories: MenuCategory[]): Promise<void>;
  deleteCategory(restaurantId: string, id: string): Promise<void>;
  countProductsInCategory(restaurantId: string, categoryId: string): Promise<number>;

  listProducts(restaurantId: string): Promise<Product[]>;
  findProduct(restaurantId: string, id: string): Promise<Product | null>;
  findProductsByIds(restaurantId: string, ids: string[]): Promise<Product[]>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(restaurantId: string, id: string): Promise<void>;
}

export interface OrderListFilter {
  statuses?: readonly OrderStatus[];
  createdSince?: string;
}

export interface OrderRepository {
  /** Incremento atômico por restaurante (BR-003.7). */
  nextNumber(restaurantId: string): Promise<number>;
  save(order: Order): Promise<void>;
  findById(restaurantId: string, id: string): Promise<Order | null>;
  list(restaurantId: string, filter: OrderListFilter): Promise<Order[]>;
}
