import {
  CatalogUseCases,
  ChangeOrderStatus,
  GetDashboard,
  GetMyRestaurant,
  GetPublicMenu,
  ListOrders,
  Login,
  PlaceOrder,
  RegisterRestaurant,
  UpdateRestaurantSettings,
  type Actor,
  type Clock,
  type DashboardQueries,
  type HumanVerifier,
  type IdGenerator,
  type ImageStorage,
  type OrderNotifier,
  type PasswordHasher,
  type TokenService,
} from "../../application";
import type {
  AccountRepository,
  CatalogRepository,
  OrderRepository,
  RestaurantRepository,
} from "../../domain";

export interface Dependencies {
  accounts: AccountRepository;
  restaurants: RestaurantRepository;
  catalog: CatalogRepository;
  orders: OrderRepository;
  dashboard: DashboardQueries;
  images: ImageStorage;
  notifier: OrderNotifier;
  hasher: PasswordHasher;
  tokens: TokenService;
  ids: IdGenerator;
  clock: Clock;
  human: HumanVerifier;
}

export function buildUseCases(d: Dependencies) {
  return {
    register: new RegisterRestaurant(d.accounts, d.hasher, d.tokens, d.ids, d.clock),
    login: new Login(d.accounts, d.restaurants, d.hasher, d.tokens),
    getMyRestaurant: new GetMyRestaurant(d.restaurants),
    updateRestaurant: new UpdateRestaurantSettings(d.restaurants),
    catalog: new CatalogUseCases(d.catalog, d.images, d.ids),
    getPublicMenu: new GetPublicMenu(d.restaurants, d.catalog),
    placeOrder: new PlaceOrder(d.restaurants, d.catalog, d.orders, d.notifier, d.ids, d.clock),
    listOrders: new ListOrders(d.orders, d.clock),
    changeOrderStatus: new ChangeOrderStatus(d.orders, d.notifier, d.clock),
    getDashboard: new GetDashboard(d.restaurants, d.dashboard, d.clock),
  };
}

export type UseCases = ReturnType<typeof buildUseCases>;

export interface Bindings {
  DB: D1Database;
  IMAGES: KVNamespace;
  ORDERS_HUB: DurableObjectNamespace;
  JWT_SECRET: string;
  ALLOWED_ORIGIN?: string;
  /** Secret do widget Turnstile (ADR-0007). `wrangler secret put TURNSTILE_SECRET_KEY` */
  TURNSTILE_SECRET_KEY?: string;
  /** "true" desliga a verificação anti-robô. Só para testes e dev local. */
  TURNSTILE_DISABLED?: string;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: { useCases: UseCases; tokens: TokenService; actor: Actor; human: HumanVerifier };
}
