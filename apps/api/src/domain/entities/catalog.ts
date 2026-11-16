import { Money } from "../value-objects/money";
import { boundedText, normalizeForComparison } from "../value-objects/text";

export const MAX_PRODUCT_PRICE_CENTS = 1_000_000; // BR-002.3 — R$ 10.000,00

export interface MenuCategorySnapshot {
  id: string;
  restaurantId: string;
  name: string;
  position: number;
}

export class MenuCategory {
  private constructor(private state: MenuCategorySnapshot) {}

  static create(props: Omit<MenuCategorySnapshot, "name"> & { name: string }): MenuCategory {
    return new MenuCategory({ ...props, name: MenuCategory.validName(props.name) });
  }

  static restore(s: MenuCategorySnapshot): MenuCategory {
    return new MenuCategory({ ...s });
  }

  get id(): string {
    return this.state.id;
  }
  get normalizedName(): string {
    return normalizeForComparison(this.state.name);
  }

  rename(name: string): void {
    this.state.name = MenuCategory.validName(name);
  }

  moveTo(position: number): void {
    this.state.position = position;
  }

  toSnapshot(): MenuCategorySnapshot {
    return { ...this.state };
  }

  private static validName(name: string): string {
    return boundedText(name, { field: "name", min: 2, max: 40 }); // BR-002.1
  }
}

export interface ProductSnapshot {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  imageKey: string | null;
  available: boolean;
}

export type ProductFields = Pick<ProductSnapshot, "categoryId" | "name" | "description" | "priceCents" | "available">;

export class Product {
  private constructor(private state: ProductSnapshot) {}

  static create(props: { id: string; restaurantId: string } & ProductFields): Product {
    return new Product(Product.validate({ ...props, imageKey: null }));
  }

  static restore(s: ProductSnapshot): Product {
    return new Product({ ...s });
  }

  get id(): string {
    return this.state.id;
  }
  get name(): string {
    return this.state.name;
  }
  get price(): Money {
    return Money.of(this.state.priceCents);
  }
  get isAvailable(): boolean {
    return this.state.available;
  }
  get restaurantId(): string {
    return this.state.restaurantId;
  }

  update(changes: Partial<ProductFields>): void {
    this.state = Product.validate({ ...this.state, ...changes });
  }

  /** BR-002.5 — devolve a chave anterior para o caso de uso apagar do storage. */
  changeImage(key: string): string | null {
    const previous = this.state.imageKey;
    this.state.imageKey = key;
    return previous;
  }

  toSnapshot(): ProductSnapshot {
    return { ...this.state };
  }

  private static validate(s: ProductSnapshot): ProductSnapshot {
    return {
      ...s,
      name: boundedText(s.name, { field: "name", min: 2, max: 80 }),
      description: boundedText(s.description ?? "", { field: "description", min: 0, max: 300 }),
      priceCents: Money.positive(s.priceCents, "priceCents", MAX_PRODUCT_PRICE_CENTS).cents,
    };
  }
}

/**
 * A chave de imagem pode ser um objeto no KV ou uma URL https externa
 * (usado pelos dados de demonstração, com fotos do Unsplash). URLs externas
 * nunca são apagadas do storage.
 */
export function isExternalImage(key: string): boolean {
  return key.startsWith("https://");
}
