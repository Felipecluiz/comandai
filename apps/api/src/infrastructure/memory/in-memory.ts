import type {
  Actor,
  DailyRevenue,
  DashboardQueries,
  DashboardTotals,
  DateRange,
  ImageStorage,
  OrderEvent,
  OrderNotifier,
  PasswordHasher,
  TokenService,
  TopProduct,
} from "../../application";
import {
  MenuCategory,
  Order,
  Product,
  Restaurant,
  normalizeForComparison,
  type AccountRepository,
  type CatalogRepository,
  type MenuCategorySnapshot,
  type OrderListFilter,
  type OrderRepository,
  type OrderSnapshot,
  type Owner,
  type ProductSnapshot,
  type RestaurantRepository,
  type RestaurantSnapshot,
} from "../../domain";

/** Estado compartilhado pelos adapters em memória. Guarda snapshots para imitar a persistência. */
export class InMemoryStore {
  readonly restaurants = new Map<string, RestaurantSnapshot>();
  readonly owners = new Map<string, Owner>();
  readonly categories = new Map<string, MenuCategorySnapshot>();
  readonly products = new Map<string, ProductSnapshot>();
  readonly orders = new Map<string, OrderSnapshot>();
  readonly orderCounters = new Map<string, number>();
}

export class InMemoryAccountRepository implements AccountRepository {
  constructor(private readonly db: InMemoryStore) {}

  async findOwnerByEmail(email: string) {
    return [...this.db.owners.values()].find((o) => o.email === email) ?? null;
  }
  async slugExists(slug: string) {
    return [...this.db.restaurants.values()].some((r) => r.slug === slug);
  }
  async createAccount(restaurant: Restaurant, owner: Owner) {
    this.db.restaurants.set(restaurant.id, restaurant.toSnapshot());
    this.db.owners.set(owner.id, { ...owner });
  }
}

export class InMemoryRestaurantRepository implements RestaurantRepository {
  constructor(private readonly db: InMemoryStore) {}

  async findById(id: string) {
    const s = this.db.restaurants.get(id);
    return s ? Restaurant.restore(s) : null;
  }
  async findBySlug(slug: string) {
    const s = [...this.db.restaurants.values()].find((r) => r.slug === slug);
    return s ? Restaurant.restore(s) : null;
  }
  async save(restaurant: Restaurant) {
    this.db.restaurants.set(restaurant.id, restaurant.toSnapshot());
  }
}

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(private readonly db: InMemoryStore) {}

  private categoriesOf(restaurantId: string) {
    return [...this.db.categories.values()].filter((c) => c.restaurantId === restaurantId);
  }
  private productsOf(restaurantId: string) {
    return [...this.db.products.values()].filter((p) => p.restaurantId === restaurantId);
  }

  async listCategories(restaurantId: string) {
    return this.categoriesOf(restaurantId)
      .sort((a, b) => a.position - b.position)
      .map(MenuCategory.restore);
  }
  async findCategory(restaurantId: string, id: string) {
    const s = this.db.categories.get(id);
    return s && s.restaurantId === restaurantId ? MenuCategory.restore(s) : null;
  }
  async findCategoryByName(restaurantId: string, normalizedName: string) {
    const s = this.categoriesOf(restaurantId).find((c) => normalizeForComparison(c.name) === normalizedName);
    return s ? MenuCategory.restore(s) : null;
  }
  async saveCategory(category: MenuCategory) {
    this.db.categories.set(category.id, category.toSnapshot());
  }
  async saveCategories(categories: MenuCategory[]) {
    for (const c of categories) await this.saveCategory(c);
  }
  async deleteCategory(restaurantId: string, id: string) {
    if (this.db.categories.get(id)?.restaurantId === restaurantId) this.db.categories.delete(id);
  }
  async countProductsInCategory(restaurantId: string, categoryId: string) {
    return this.productsOf(restaurantId).filter((p) => p.categoryId === categoryId).length;
  }
  async listProducts(restaurantId: string) {
    return this.productsOf(restaurantId)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .map(Product.restore);
  }
  async findProduct(restaurantId: string, id: string) {
    const s = this.db.products.get(id);
    return s && s.restaurantId === restaurantId ? Product.restore(s) : null;
  }
  async findProductsByIds(restaurantId: string, ids: string[]) {
    return this.productsOf(restaurantId)
      .filter((p) => ids.includes(p.id))
      .map(Product.restore);
  }
  async saveProduct(product: Product) {
    this.db.products.set(product.id, product.toSnapshot());
  }
  async deleteProduct(restaurantId: string, id: string) {
    if (this.db.products.get(id)?.restaurantId === restaurantId) this.db.products.delete(id);
  }
}

export class InMemoryOrderRepository implements OrderRepository {
  constructor(private readonly db: InMemoryStore) {}

  async nextNumber(restaurantId: string) {
    const next = (this.db.orderCounters.get(restaurantId) ?? 0) + 1;
    this.db.orderCounters.set(restaurantId, next);
    return next;
  }
  async save(order: Order) {
    this.db.orders.set(order.id, order.toSnapshot());
  }
  async findById(restaurantId: string, id: string) {
    const s = this.db.orders.get(id);
    return s && s.restaurantId === restaurantId ? Order.restore(s) : null;
  }
  async list(restaurantId: string, { statuses, createdSince }: OrderListFilter) {
    return [...this.db.orders.values()]
      .filter((o) => o.restaurantId === restaurantId)
      .filter((o) => !statuses || statuses.includes(o.status))
      .filter((o) => !createdSince || o.createdAt >= createdSince)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(Order.restore);
  }
}

export class InMemoryDashboardQueries implements DashboardQueries {
  constructor(private readonly db: InMemoryStore) {}

  private ordersIn(restaurantId: string, { from, to }: DateRange) {
    return [...this.db.orders.values()].filter(
      (o) => o.restaurantId === restaurantId && o.localDate >= from && o.localDate <= to,
    );
  }

  async totals(restaurantId: string, range: DateRange): Promise<DashboardTotals> {
    const orders = this.ordersIn(restaurantId, range);
    const valid = orders.filter((o) => o.status !== "cancelled");
    return {
      revenueCents: valid.reduce((s, o) => s + o.totalCents, 0),
      orders: valid.length,
      cancelled: orders.length - valid.length,
    };
  }

  async revenueByDay(restaurantId: string, range: DateRange): Promise<DailyRevenue[]> {
    const byDay = new Map<string, DailyRevenue>();
    for (const o of this.ordersIn(restaurantId, range).filter((o) => o.status !== "cancelled")) {
      const day = byDay.get(o.localDate) ?? { date: o.localDate, revenueCents: 0, orders: 0 };
      byDay.set(o.localDate, { ...day, revenueCents: day.revenueCents + o.totalCents, orders: day.orders + 1 });
    }
    return [...byDay.values()];
  }

  async topProducts(restaurantId: string, range: DateRange, limit: number): Promise<TopProduct[]> {
    const byProduct = new Map<string, TopProduct>();
    const valid = this.ordersIn(restaurantId, range).filter((o) => o.status !== "cancelled");
    for (const item of valid.flatMap((o) => o.items)) {
      const acc = byProduct.get(item.productId) ?? { productId: item.productId, name: item.name, quantity: 0, revenueCents: 0 };
      byProduct.set(item.productId, {
        ...acc,
        quantity: acc.quantity + item.quantity,
        revenueCents: acc.revenueCents + item.totalCents,
      });
    }
    return [...byProduct.values()]
      .sort((a, b) => b.quantity - a.quantity || b.revenueCents - a.revenueCents) // BR-005.5
      .slice(0, limit);
  }
}

// ---------- Fakes de serviços ----------

export class FakePasswordHasher implements PasswordHasher {
  async hash(password: string) {
    return `fake$${password}`;
  }
  async verify(password: string, hash: string) {
    return hash === `fake$${password}`;
  }
}

export class FakeTokenService implements TokenService {
  async sign(actor: Actor) {
    return `token:${actor.ownerId}:${actor.restaurantId}`;
  }
  async verify(token: string) {
    const [prefix, ownerId, restaurantId] = token.split(":");
    return prefix === "token" && ownerId && restaurantId ? { ownerId, restaurantId } : null;
  }
}

export class InMemoryImageStorage implements ImageStorage {
  readonly files = new Map<string, { data: ArrayBuffer; contentType: string }>();
  async put(key: string, data: ArrayBuffer, contentType: string) {
    this.files.set(key, { data, contentType });
  }
  async delete(key: string) {
    this.files.delete(key);
  }
}

export class RecordingOrderNotifier implements OrderNotifier {
  readonly events: Array<{ restaurantId: string; event: OrderEvent }> = [];
  async publish(restaurantId: string, event: OrderEvent) {
    this.events.push({ restaurantId, event });
  }
}
