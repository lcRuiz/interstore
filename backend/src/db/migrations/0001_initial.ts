import type { Migration } from '../migrate.js';

/**
 * Modelo de datos completo (ADR 0001, docs/adr/0001-data-model.md): catálogo,
 * usuarios, carrito, favoritos, pedidos y ledger de puntos. Las funciones de
 * carrito/pedidos/puntos llegan en otras features; el esquema ya existe para
 * que el catálogo nazca sobre su forma definitiva.
 *
 * Una migración publicada o aplicada NO se edita: los cambios van en una nueva.
 */
export const initial: Migration = {
  version: 1,
  name: '0001_initial',
  sql: `
CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug GLOB '[a-z0-9-]*'),
  name TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE products (
  id                INTEGER PRIMARY KEY,
  category_id       INTEGER NOT NULL REFERENCES categories (id),
  name              TEXT    NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  search_name       TEXT    NOT NULL,
  price             INTEGER NOT NULL CHECK (price > 0),
  image_url         TEXT    NOT NULL,
  stock             INTEGER NOT NULL CHECK (stock >= 0),
  points_multiplier INTEGER NOT NULL DEFAULT 1 CHECK (points_multiplier IN (1, 2)),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;
CREATE INDEX idx_products_category ON products (category_id, id);

CREATE TABLE users (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
) STRICT;

CREATE TABLE cart_items (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity   INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  added_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, product_id)
) STRICT, WITHOUT ROWID;

CREATE TABLE favorites (
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, product_id)
) STRICT, WITHOUT ROWID;

CREATE TABLE orders (
  id              INTEGER PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users (id),
  idempotency_key TEXT    NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 64),
  status          TEXT    NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  total           INTEGER NOT NULL CHECK (total > 0),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, idempotency_key)
) STRICT;
CREATE INDEX idx_orders_user ON orders (user_id, id DESC);

CREATE TABLE order_items (
  order_id     INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products (id),
  product_name TEXT    NOT NULL,
  unit_price   INTEGER NOT NULL CHECK (unit_price > 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, product_id)
) STRICT, WITHOUT ROWID;

CREATE TABLE points_ledger (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  action     TEXT    NOT NULL CHECK (action IN ('CART_ADD', 'FAVORITE_ADD', 'PURCHASE')),
  ref_id     INTEGER NOT NULL,
  points     INTEGER NOT NULL CHECK (points <> 0),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, action, ref_id)
) STRICT;
CREATE INDEX idx_points_ledger_user ON points_ledger (user_id, id DESC);

CREATE TRIGGER trg_points_ledger_balance AFTER INSERT ON points_ledger
BEGIN
  UPDATE users SET points_balance = points_balance + NEW.points WHERE id = NEW.user_id;
END;
CREATE TRIGGER trg_points_ledger_no_update BEFORE UPDATE ON points_ledger
BEGIN SELECT RAISE(ABORT, 'points_ledger is append-only'); END;
CREATE TRIGGER trg_points_ledger_no_delete BEFORE DELETE ON points_ledger
BEGIN SELECT RAISE(ABORT, 'points_ledger is append-only'); END;
`,
};
