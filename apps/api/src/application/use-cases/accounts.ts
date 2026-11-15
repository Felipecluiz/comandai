import {
  Email,
  EmailTakenError,
  InvalidCredentialsError,
  NotFoundError,
  Restaurant,
  SlugTakenError,
  assertPasswordPolicy,
  type AccountRepository,
  type RestaurantChanges,
  type RestaurantRepository,
  type RestaurantSnapshot,
} from "../../domain";
import type { Actor, Clock, IdGenerator, PasswordHasher, TokenService } from "../ports";

export interface RegisterCommand {
  restaurantName: string;
  slug: string;
  whatsapp: string;
  email: string;
  password: string;
}

export interface Session {
  token: string;
  restaurant: RestaurantSnapshot;
}

export class RegisterRestaurant {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(cmd: RegisterCommand): Promise<Session> {
    const now = this.clock.now();
    const restaurant = Restaurant.create(
      { id: this.ids.next(), name: cmd.restaurantName, slug: cmd.slug, whatsapp: cmd.whatsapp },
      now,
    );
    const email = Email.create(cmd.email);
    assertPasswordPolicy(cmd.password);

    const { slug } = restaurant.toSnapshot();
    if (await this.accounts.slugExists(slug)) throw new SlugTakenError(slug);
    if (await this.accounts.findOwnerByEmail(email.value)) throw new EmailTakenError();

    const owner = {
      id: this.ids.next(),
      restaurantId: restaurant.id,
      email: email.value,
      passwordHash: await this.hasher.hash(cmd.password),
      createdAt: now.toISOString(),
    };
    await this.accounts.createAccount(restaurant, owner);

    const token = await this.tokens.sign({ ownerId: owner.id, restaurantId: restaurant.id });
    return { token, restaurant: restaurant.toSnapshot() };
  }
}

export class Login {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly restaurants: RestaurantRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute({ email, password }: { email: string; password: string }): Promise<Session> {
    const owner = await this.accounts.findOwnerByEmail(email.trim().toLowerCase());
    // BR-001.4 — mesmo erro para e-mail inexistente e senha errada
    if (!owner || !(await this.hasher.verify(password, owner.passwordHash))) throw new InvalidCredentialsError();

    const restaurant = await this.restaurants.findById(owner.restaurantId);
    if (!restaurant) throw new InvalidCredentialsError();

    const token = await this.tokens.sign({ ownerId: owner.id, restaurantId: restaurant.id });
    return { token, restaurant: restaurant.toSnapshot() };
  }
}

export class GetMyRestaurant {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(actor: Actor): Promise<RestaurantSnapshot> {
    return (await findRestaurantOrFail(this.restaurants, actor.restaurantId)).toSnapshot();
  }
}

export class UpdateRestaurantSettings {
  constructor(private readonly restaurants: RestaurantRepository) {}

  async execute(actor: Actor, changes: RestaurantChanges): Promise<RestaurantSnapshot> {
    const restaurant = await findRestaurantOrFail(this.restaurants, actor.restaurantId);
    restaurant.update(changes);
    await this.restaurants.save(restaurant);
    return restaurant.toSnapshot();
  }
}

export async function findRestaurantOrFail(repo: RestaurantRepository, id: string): Promise<Restaurant> {
  const restaurant = await repo.findById(id);
  if (!restaurant) throw new NotFoundError("Restaurante");
  return restaurant;
}
