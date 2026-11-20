import type { Actor, Clock, IdGenerator } from "../src/application";
import {
  FakeHumanVerifier,
  FakePasswordHasher,
  FakeTokenService,
  InMemoryAccountRepository,
  InMemoryCatalogRepository,
  InMemoryDashboardQueries,
  InMemoryImageStorage,
  InMemoryOrderRepository,
  InMemoryRestaurantRepository,
  InMemoryStore,
  RecordingOrderNotifier,
} from "../src/infrastructure/memory/in-memory";
import { buildUseCases } from "../src/interface/http/container";

export class FixedClock implements Clock {
  // 15/11/2026 12:00 em São Paulo
  constructor(public current = new Date("2026-11-15T15:00:00.000Z")) {}
  now() {
    return new Date(this.current);
  }
  set(iso: string) {
    this.current = new Date(iso);
  }
}

export class SequentialIds implements IdGenerator {
  private n = 0;
  next() {
    return `id-${++this.n}`;
  }
}

export function makeSut() {
  const store = new InMemoryStore();
  const deps = {
    accounts: new InMemoryAccountRepository(store),
    restaurants: new InMemoryRestaurantRepository(store),
    catalog: new InMemoryCatalogRepository(store),
    orders: new InMemoryOrderRepository(store),
    dashboard: new InMemoryDashboardQueries(store),
    images: new InMemoryImageStorage(),
    notifier: new RecordingOrderNotifier(),
    hasher: new FakePasswordHasher(),
    tokens: new FakeTokenService(),
    ids: new SequentialIds(),
    clock: new FixedClock(),
    human: new FakeHumanVerifier(),
  };
  return { store, ...deps, useCases: buildUseCases(deps) };
}

export const registration = {
  restaurantName: "Pizzaria do Zé",
  slug: "pizzaria-do-ze",
  whatsapp: "(11) 98765-4321",
  email: "ze@pizzaria.com",
  password: "segredo123",
};

/** Restaurante aberto, taxa R$ 5, sem mínimo, com uma pizza de R$ 40. */
export async function openRestaurantWithMenu() {
  const sut = makeSut();
  const session = await sut.useCases.register.execute(registration);
  const actor = (await sut.tokens.verify(session.token)) as Actor;
  await sut.useCases.updateRestaurant.execute(actor, { isOpen: true, deliveryFeeCents: 500 });

  const pizzas = await sut.useCases.catalog.createCategory(actor, "Pizzas");
  const calabresa = await sut.useCases.catalog.createProduct(actor, {
    categoryId: pizzas.id,
    name: "Calabresa",
    description: "Molho, mussarela, calabresa e cebola",
    priceCents: 4000,
    available: true,
  });
  return { ...sut, actor, pizzas, calabresa, slug: registration.slug };
}

export function deliveryOrder(productId: string, quantity = 2) {
  return {
    customer: { name: "Maria", phone: "11 91234-5678" },
    fulfillment: {
      type: "delivery",
      address: { street: "Rua das Flores", number: "123", district: "Centro", complement: "Apto 4", reference: "" },
    },
    payment: { method: "pix" },
    items: [{ productId, quantity, notes: "Sem cebola" }],
  };
}
