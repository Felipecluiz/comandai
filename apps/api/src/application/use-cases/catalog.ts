import {
  CategoryNameTakenError,
  CategoryNotEmptyError,
  InvalidImageError,
  isExternalImage,
  MenuCategory,
  NotFoundError,
  Product,
  ValidationError,
  normalizeForComparison,
  type CatalogRepository,
  type MenuCategorySnapshot,
  type ProductFields,
  type ProductSnapshot,
  type RestaurantRepository,
  type RestaurantSnapshot,
} from "../../domain";
import type { Actor, IdGenerator, ImageStorage } from "../ports";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export interface AdminCatalog {
  categories: MenuCategorySnapshot[];
  products: ProductSnapshot[];
}

export class CatalogUseCases {
  constructor(
    private readonly catalog: CatalogRepository,
    private readonly images: ImageStorage,
    private readonly ids: IdGenerator,
  ) {}

  async getAdminCatalog({ restaurantId }: Actor): Promise<AdminCatalog> {
    const [categories, products] = await Promise.all([
      this.catalog.listCategories(restaurantId),
      this.catalog.listProducts(restaurantId),
    ]);
    return { categories: categories.map((c) => c.toSnapshot()), products: products.map((p) => p.toSnapshot()) };
  }

  // ---------- Categorias ----------

  /** AC-002.1 — nova categoria vai para o fim. */
  async createCategory({ restaurantId }: Actor, name: string): Promise<MenuCategorySnapshot> {
    const existing = await this.catalog.listCategories(restaurantId);
    const category = MenuCategory.create({ id: this.ids.next(), restaurantId, name, position: existing.length });
    await this.assertNameAvailable(category);
    await this.catalog.saveCategory(category);
    return category.toSnapshot();
  }

  async renameCategory({ restaurantId }: Actor, id: string, name: string): Promise<MenuCategorySnapshot> {
    const category = await this.findCategoryOrFail(restaurantId, id);
    category.rename(name);
    await this.assertNameAvailable(category);
    await this.catalog.saveCategory(category);
    return category.toSnapshot();
  }

  /** AC-002.7 — a lista enviada define a ordem; precisa conter exatamente as categorias do restaurante. */
  async reorderCategories({ restaurantId }: Actor, orderedIds: string[]): Promise<MenuCategorySnapshot[]> {
    const categories = await this.catalog.listCategories(restaurantId);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const sameSet = orderedIds.length === byId.size && new Set(orderedIds).size === byId.size;
    if (!sameSet || orderedIds.some((id) => !byId.has(id))) {
      throw new ValidationError("ids", "Envie todas as categorias, sem repetir");
    }
    const reordered = orderedIds.flatMap((id, position) => {
      const category = byId.get(id);
      category?.moveTo(position);
      return category ? [category] : []; // sempre existe: validado acima
    });
    await this.catalog.saveCategories(reordered);
    return reordered.map((c) => c.toSnapshot());
  }

  async deleteCategory({ restaurantId }: Actor, id: string): Promise<void> {
    await this.findCategoryOrFail(restaurantId, id);
    if ((await this.catalog.countProductsInCategory(restaurantId, id)) > 0) throw new CategoryNotEmptyError(); // AC-002.2
    await this.catalog.deleteCategory(restaurantId, id);
  }

  // ---------- Produtos ----------

  async createProduct({ restaurantId }: Actor, fields: ProductFields): Promise<ProductSnapshot> {
    await this.findCategoryOrFail(restaurantId, fields.categoryId); // AC-002.4
    const product = Product.create({ id: this.ids.next(), restaurantId, ...fields });
    await this.catalog.saveProduct(product);
    return product.toSnapshot();
  }

  async updateProduct({ restaurantId }: Actor, id: string, changes: Partial<ProductFields>): Promise<ProductSnapshot> {
    const product = await this.findProductOrFail(restaurantId, id);
    if (changes.categoryId) await this.findCategoryOrFail(restaurantId, changes.categoryId);
    product.update(changes);
    await this.catalog.saveProduct(product);
    return product.toSnapshot();
  }

  async deleteProduct({ restaurantId }: Actor, id: string): Promise<void> {
    const product = await this.findProductOrFail(restaurantId, id);
    await this.catalog.deleteProduct(restaurantId, id);
    const { imageKey } = product.toSnapshot();
    if (imageKey && !isExternalImage(imageKey)) await this.images.delete(imageKey);
  }

  /** BR-002.5 / AC-002.5 */
  async uploadProductImage(
    { restaurantId }: Actor,
    productId: string,
    file: { data: ArrayBuffer; contentType: string },
  ): Promise<ProductSnapshot> {
    const extension = IMAGE_EXTENSIONS[file.contentType];
    if (!extension) throw new InvalidImageError("Envie uma imagem JPG, PNG ou WEBP");
    if (file.data.byteLength === 0 || file.data.byteLength > MAX_IMAGE_BYTES) {
      throw new InvalidImageError("A imagem deve ter até 2 MB");
    }

    const product = await this.findProductOrFail(restaurantId, productId);
    const key = `${restaurantId}/${productId}-${this.ids.next()}.${extension}`;
    await this.images.put(key, file.data, file.contentType);

    const previousKey = product.changeImage(key);
    await this.catalog.saveProduct(product);
    if (previousKey && !isExternalImage(previousKey)) await this.images.delete(previousKey);
    return product.toSnapshot();
  }

  private async assertNameAvailable(category: MenuCategory): Promise<void> {
    const { restaurantId, name } = category.toSnapshot();
    const existing = await this.catalog.findCategoryByName(restaurantId, normalizeForComparison(name));
    if (existing && existing.id !== category.id) throw new CategoryNameTakenError(name);
  }

  private async findCategoryOrFail(restaurantId: string, id: string): Promise<MenuCategory> {
    const category = await this.catalog.findCategory(restaurantId, id);
    if (!category) throw new NotFoundError("Categoria");
    return category;
  }

  private async findProductOrFail(restaurantId: string, id: string): Promise<Product> {
    const product = await this.catalog.findProduct(restaurantId, id);
    if (!product) throw new NotFoundError("Produto");
    return product;
  }
}

export interface PublicMenu {
  restaurant: RestaurantSnapshot;
  sections: Array<MenuCategorySnapshot & { products: ProductSnapshot[] }>;
}

/** BR-002.6 — só o que está disponível, sem categorias vazias, na ordem definida. */
export class GetPublicMenu {
  constructor(
    private readonly restaurants: RestaurantRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async execute(slug: string): Promise<PublicMenu> {
    const restaurant = await this.restaurants.findBySlug(slug);
    if (!restaurant) throw new NotFoundError("Restaurante");

    const [categories, products] = await Promise.all([
      this.catalog.listCategories(restaurant.id),
      this.catalog.listProducts(restaurant.id),
    ]);
    const available = products.filter((p) => p.isAvailable).map((p) => p.toSnapshot());

    const sections = categories
      .map((c) => c.toSnapshot())
      .sort((a, b) => a.position - b.position)
      .map((category) => ({ ...category, products: available.filter((p) => p.categoryId === category.id) }))
      .filter((section) => section.products.length > 0);

    return { restaurant: restaurant.toSnapshot(), sections };
  }
}
