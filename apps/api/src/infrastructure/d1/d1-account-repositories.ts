import {
  Restaurant,
  type AccountRepository,
  type Owner,
  type RestaurantRepository,
  type RestaurantSnapshot,
} from "../../domain";

interface RestaurantRow {
  id: string;
  slug: string;
  name: string;
  whatsapp: string;
  time_zone: string;
  delivery_fee_cents: number;
  min_order_cents: number;
  accepts_delivery: number;
  accepts_pickup: number;
  is_open: number;
  created_at: string;
}

interface OwnerRow {
  id: string;
  restaurant_id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

const toRestaurant = (r: RestaurantRow): Restaurant =>
  Restaurant.restore({
    id: r.id,
    slug: r.slug,
    name: r.name,
    whatsapp: r.whatsapp,
    timeZone: r.time_zone,
    deliveryFeeCents: r.delivery_fee_cents,
    minOrderCents: r.min_order_cents,
    acceptsDelivery: r.accepts_delivery === 1,
    acceptsPickup: r.accepts_pickup === 1,
    isOpen: r.is_open === 1,
    createdAt: r.created_at,
  });

function upsertRestaurant(db: D1Database, s: RestaurantSnapshot): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO restaurants
         (id, slug, name, whatsapp, time_zone, delivery_fee_cents, min_order_cents,
          accepts_delivery, accepts_pickup, is_open, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name, whatsapp = excluded.whatsapp,
         delivery_fee_cents = excluded.delivery_fee_cents, min_order_cents = excluded.min_order_cents,
         accepts_delivery = excluded.accepts_delivery, accepts_pickup = excluded.accepts_pickup,
         is_open = excluded.is_open`,
    )
    .bind(
      s.id,
      s.slug,
      s.name,
      s.whatsapp,
      s.timeZone,
      s.deliveryFeeCents,
      s.minOrderCents,
      Number(s.acceptsDelivery),
      Number(s.acceptsPickup),
      Number(s.isOpen),
      s.createdAt,
    );
}

export class D1AccountRepository implements AccountRepository {
  constructor(private readonly db: D1Database) {}

  async findOwnerByEmail(email: string): Promise<Owner | null> {
    const row = await this.db.prepare("SELECT * FROM owners WHERE email = ?").bind(email).first<OwnerRow>();
    return row
      ? {
          id: row.id,
          restaurantId: row.restaurant_id,
          email: row.email,
          passwordHash: row.password_hash,
          createdAt: row.created_at,
        }
      : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.db.prepare("SELECT 1 FROM restaurants WHERE slug = ?").bind(slug).first()) !== null;
  }

  /** `batch` no D1 roda numa transação: ou cria os dois, ou nenhum. */
  async createAccount(restaurant: Restaurant, owner: Owner): Promise<void> {
    await this.db.batch([
      upsertRestaurant(this.db, restaurant.toSnapshot()),
      this.db
        .prepare("INSERT INTO owners (id, restaurant_id, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
        .bind(owner.id, owner.restaurantId, owner.email, owner.passwordHash, owner.createdAt),
    ]);
  }
}

export class D1RestaurantRepository implements RestaurantRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Restaurant | null> {
    const row = await this.db.prepare("SELECT * FROM restaurants WHERE id = ?").bind(id).first<RestaurantRow>();
    return row ? toRestaurant(row) : null;
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const row = await this.db.prepare("SELECT * FROM restaurants WHERE slug = ?").bind(slug).first<RestaurantRow>();
    return row ? toRestaurant(row) : null;
  }

  async save(restaurant: Restaurant): Promise<void> {
    await upsertRestaurant(this.db, restaurant.toSnapshot()).run();
  }
}
