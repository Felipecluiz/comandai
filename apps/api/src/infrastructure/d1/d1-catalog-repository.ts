import { MenuCategory, Product, type CatalogRepository } from "../../domain";

interface CategoryRow {
  id: string;
  restaurant_id: string;
  name: string;
  position: number;
}

interface ProductRow {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price_cents: number;
  image_key: string | null;
  available: number;
}

const toCategory = (r: CategoryRow) =>
  MenuCategory.restore({ id: r.id, restaurantId: r.restaurant_id, name: r.name, position: r.position });

const toProduct = (r: ProductRow) =>
  Product.restore({
    id: r.id,
    restaurantId: r.restaurant_id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    priceCents: r.price_cents,
    imageKey: r.image_key,
    available: r.available === 1,
  });

/** Toda query filtra por restaurant_id (ADR-0002). */
export class D1CatalogRepository implements CatalogRepository {
  constructor(private readonly db: D1Database) {}

  async listCategories(restaurantId: string) {
    const { results } = await this.db
      .prepare("SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY position")
      .bind(restaurantId)
      .all<CategoryRow>();
    return results.map(toCategory);
  }

  async findCategory(restaurantId: string, id: string) {
    const row = await this.db
      .prepare("SELECT * FROM menu_categories WHERE restaurant_id = ? AND id = ?")
      .bind(restaurantId, id)
      .first<CategoryRow>();
    return row ? toCategory(row) : null;
  }

  async findCategoryByName(restaurantId: string, normalizedName: string) {
    const row = await this.db
      .prepare("SELECT * FROM menu_categories WHERE restaurant_id = ? AND name_normalized = ?")
      .bind(restaurantId, normalizedName)
      .first<CategoryRow>();
    return row ? toCategory(row) : null;
  }

  async saveCategory(category: MenuCategory) {
    await this.upsertCategory(category).run();
  }

  async saveCategories(categories: MenuCategory[]) {
    await this.db.batch(categories.map((c) => this.upsertCategory(c)));
  }

  async deleteCategory(restaurantId: string, id: string) {
    await this.db.prepare("DELETE FROM menu_categories WHERE restaurant_id = ? AND id = ?").bind(restaurantId, id).run();
  }

  async countProductsInCategory(restaurantId: string, categoryId: string) {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS total FROM products WHERE restaurant_id = ? AND category_id = ?")
      .bind(restaurantId, categoryId)
      .first<{ total: number }>();
    return row?.total ?? 0;
  }

  async listProducts(restaurantId: string) {
    const { results } = await this.db
      .prepare("SELECT * FROM products WHERE restaurant_id = ? ORDER BY name COLLATE NOCASE")
      .bind(restaurantId)
      .all<ProductRow>();
    return results.map(toProduct);
  }

  async findProduct(restaurantId: string, id: string) {
    const row = await this.db
      .prepare("SELECT * FROM products WHERE restaurant_id = ? AND id = ?")
      .bind(restaurantId, id)
      .first<ProductRow>();
    return row ? toProduct(row) : null;
  }

  /** `json_each` evita montar "IN (?, ?, …)" dinamicamente e o limite de parâmetros. */
  async findProductsByIds(restaurantId: string, ids: string[]) {
    if (ids.length === 0) return [];
    const { results } = await this.db
      .prepare("SELECT * FROM products WHERE restaurant_id = ? AND id IN (SELECT value FROM json_each(?))")
      .bind(restaurantId, JSON.stringify(ids))
      .all<ProductRow>();
    return results.map(toProduct);
  }

  async saveProduct(product: Product) {
    const s = product.toSnapshot();
    await this.db
      .prepare(
        `INSERT INTO products (id, restaurant_id, category_id, name, description, price_cents, image_key, available)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT (id) DO UPDATE SET
           category_id = excluded.category_id, name = excluded.name, description = excluded.description,
           price_cents = excluded.price_cents, image_key = excluded.image_key, available = excluded.available`,
      )
      .bind(s.id, s.restaurantId, s.categoryId, s.name, s.description, s.priceCents, s.imageKey, Number(s.available))
      .run();
  }

  async deleteProduct(restaurantId: string, id: string) {
    await this.db.prepare("DELETE FROM products WHERE restaurant_id = ? AND id = ?").bind(restaurantId, id).run();
  }

  private upsertCategory(category: MenuCategory): D1PreparedStatement {
    const s = category.toSnapshot();
    return this.db
      .prepare(
        `INSERT INTO menu_categories (id, restaurant_id, name, name_normalized, position)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (id) DO UPDATE SET
           name = excluded.name, name_normalized = excluded.name_normalized, position = excluded.position`,
      )
      .bind(s.id, s.restaurantId, s.name, category.normalizedName, s.position);
  }
}
