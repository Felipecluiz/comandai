-- Spec 001: restaurantes (tenants) e donos
CREATE TABLE restaurants (
  id                 TEXT PRIMARY KEY,
  slug               TEXT NOT NULL UNIQUE,                -- BR-001.1
  name               TEXT NOT NULL,
  whatsapp           TEXT NOT NULL,                       -- 55 + DDD + número
  time_zone          TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (delivery_fee_cents >= 0),
  min_order_cents    INTEGER NOT NULL DEFAULT 0 CHECK (min_order_cents >= 0),
  accepts_delivery   INTEGER NOT NULL DEFAULT 1,
  accepts_pickup     INTEGER NOT NULL DEFAULT 1,
  is_open            INTEGER NOT NULL DEFAULT 0,
  order_seq          INTEGER NOT NULL DEFAULT 0,          -- BR-003.7
  created_at         TEXT NOT NULL,
  CHECK (accepts_delivery = 1 OR accepts_pickup = 1)      -- BR-001.5
);

CREATE TABLE owners (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,                     -- BR-001.3
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

-- Spec 002: catálogo
CREATE TABLE menu_categories (
  id              TEXT PRIMARY KEY,
  restaurant_id   TEXT NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  position        INTEGER NOT NULL,
  UNIQUE (restaurant_id, name_normalized)                 -- BR-002.1
);

CREATE TABLE products (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
  category_id   TEXT NOT NULL REFERENCES menu_categories (id) ON DELETE RESTRICT, -- BR-002.2
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
  image_key     TEXT,
  available     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_products_restaurant ON products (restaurant_id, category_id);

-- Spec 003/004: pedidos
CREATE TABLE orders (
  id                  TEXT PRIMARY KEY,
  restaurant_id       TEXT NOT NULL REFERENCES restaurants (id) ON DELETE CASCADE,
  number              INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('pending','accepted','preparing','ready','out_for_delivery','completed','cancelled')),
  customer_json       TEXT NOT NULL,
  fulfillment_type    TEXT NOT NULL CHECK (fulfillment_type IN ('delivery','pickup')),
  fulfillment_json    TEXT NOT NULL,
  payment_json        TEXT NOT NULL,
  subtotal_cents      INTEGER NOT NULL,
  delivery_fee_cents  INTEGER NOT NULL,
  total_cents         INTEGER NOT NULL,
  cancel_reason       TEXT,
  status_history_json TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  local_date          TEXT NOT NULL,                       -- BR-005.3
  UNIQUE (restaurant_id, number)
);
CREATE INDEX idx_orders_restaurant_created ON orders (restaurant_id, created_at DESC);
CREATE INDEX idx_orders_restaurant_status ON orders (restaurant_id, status);
CREATE INDEX idx_orders_restaurant_day ON orders (restaurant_id, local_date);

-- Snapshot dos itens (ADR-0005)
CREATE TABLE order_items (
  order_id         TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  product_id       TEXT NOT NULL,                          -- sem FK: o produto pode ser excluído depois
  name             TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  notes            TEXT NOT NULL DEFAULT '',
  total_cents      INTEGER NOT NULL,
  PRIMARY KEY (order_id, position)
);
CREATE INDEX idx_order_items_product ON order_items (product_id);
