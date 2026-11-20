/**
 * Composition root: o ÚNICO arquivo que conhece D1, KV, Durable Objects, WebCrypto e Turnstile.
 */
import { JwtTokenService } from "./infrastructure/crypto/jwt-token-service";
import { Pbkdf2PasswordHasher } from "./infrastructure/crypto/pbkdf2-password-hasher";
import { D1AccountRepository, D1RestaurantRepository } from "./infrastructure/d1/d1-account-repositories";
import { D1CatalogRepository } from "./infrastructure/d1/d1-catalog-repository";
import { D1DashboardQueries } from "./infrastructure/d1/d1-dashboard-queries";
import { D1OrderRepository } from "./infrastructure/d1/d1-order-repository";
import { DurableObjectOrderNotifier, type OrdersHub } from "./infrastructure/durable-objects/orders-hub";
import { KvImageStorage } from "./infrastructure/kv/kv-image-storage";
import { DisabledHumanVerifier, TurnstileVerifier } from "./infrastructure/turnstile/turnstile-verifier";
import { CryptoIdGenerator, SystemClock } from "./infrastructure/system/system";
import { createApp } from "./interface/http/app";
import { toOrderDto } from "./interface/http/presenters";
import type { OrderEventDto } from "@comandai/contracts";

/**
 * O binding é declarado sem o tipo da classe (Bindings em interface/http) para a camada HTTP
 * não depender da infraestrutura. Aqui, no composition root, devolvemos o tipo concreto para o RPC `broadcast()`.
 */
const ordersHubNamespace = (binding: DurableObjectNamespace) => binding as unknown as DurableObjectNamespace<OrdersHub>;

const clock = new SystemClock();
const ids = new CryptoIdGenerator();
const hasher = new Pbkdf2PasswordHasher();

const app = createApp((env) => ({
  accounts: new D1AccountRepository(env.DB),
  restaurants: new D1RestaurantRepository(env.DB),
  catalog: new D1CatalogRepository(env.DB),
  orders: new D1OrderRepository(env.DB),
  dashboard: new D1DashboardQueries(env.DB),
  images: new KvImageStorage(env.IMAGES),
  notifier: new DurableObjectOrderNotifier(ordersHubNamespace(env.ORDERS_HUB), (event) =>
    JSON.stringify({ type: event.type, order: toOrderDto(event.order) } satisfies OrderEventDto),
  ),
  tokens: new JwtTokenService(env.JWT_SECRET, clock),
  hasher,
  ids,
  clock,
  human: env.TURNSTILE_DISABLED === "true" ? new DisabledHumanVerifier() : new TurnstileVerifier(env.TURNSTILE_SECRET_KEY),
}));

export default app;
export { OrdersHub } from "./infrastructure/durable-objects/orders-hub";
