import type { ProductDto } from "@comandai/contracts";
import { createPersistentStore, useStore, type Store } from "../../shared/lib/store";

export interface CartLine {
  /** produto + observação: o mesmo produto com observações diferentes vira linhas diferentes */
  key: string;
  productId: string;
  name: string;
  /** preço exibido; o servidor recalcula no pedido (ADR-0005) */
  unitPriceCents: number;
  quantity: number;
  notes: string;
}

const stores = new Map<string, Store<CartLine[]>>();

/** Um carrinho por restaurante, sobrevivendo a recarregar a página. */
function cartStore(slug: string): Store<CartLine[]> {
  let store = stores.get(slug);
  if (!store) {
    store = createPersistentStore<CartLine[]>(`comandai:cart:${slug}`, []);
    stores.set(slug, store);
  }
  return store;
}

export function useCart(slug: string) {
  const store = cartStore(slug);
  const lines = useStore(store);

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return {
    lines,
    subtotalCents,
    count,
    add(product: ProductDto, quantity: number, notes: string) {
      const key = `${product.id}::${notes.trim()}`;
      store.set((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + quantity) } : l));
        return [
          ...prev,
          { key, productId: product.id, name: product.name, unitPriceCents: product.priceCents, quantity, notes: notes.trim() },
        ];
      });
    },
    setQuantity(key: string, quantity: number) {
      store.set((prev) =>
        quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
      );
    },
    /** Atualiza nomes/preços com o cardápio atual e remove o que saiu do ar. */
    syncWithMenu(products: ProductDto[]) {
      const byId = new Map(products.map((p) => [p.id, p]));
      store.set((prev) => {
        const next = prev.flatMap((line) => {
          const product = byId.get(line.productId);
          return product ? [{ ...line, name: product.name, unitPriceCents: product.priceCents }] : [];
        });
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    },
    clear() {
      store.set([]);
    },
  };
}
