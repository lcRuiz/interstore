/**
 * Esquema de la base de datos.
 *
 * Se define como string TS (y no como .sql) para que viaje con el build sin
 * pasos extra de copia. Es idempotente: se ejecuta en cada arranque.
 *
 * Decisiones:
 * - Montos en enteros (COP no usa centavos en la práctica) → sin errores de
 *   punto flotante.
 * - `points_ledger` registra cada otorgamiento de puntos. La restricción
 *   UNIQUE(user_id, action, ref_id) hace que la idempotencia de las
 *   recompensas la garantice la base de datos, no condicionales en el código.
 * - `users.points_balance` es una caché del ledger; se actualiza en la misma
 *   transacción que inserta en el ledger.
 * - `order_items.unit_price` congela el precio al momento de la compra.
 */
export const schema = /* sql */ `
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0)
);

CREATE TABLE IF NOT EXISTS products (
  id        INTEGER PRIMARY KEY,
  name      TEXT    NOT NULL,
  price     INTEGER NOT NULL CHECK (price >= 0),
  category  TEXT    NOT NULL,
  image_url TEXT    NOT NULL,
  stock     INTEGER NOT NULL CHECK (stock >= 0)
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TABLE IF NOT EXISTS cart_items (
  user_id    INTEGER NOT NULL REFERENCES users (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER NOT NULL REFERENCES users (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  total      INTEGER NOT NULL CHECK (total >= 0),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id   INTEGER NOT NULL REFERENCES orders (id),
  product_id INTEGER NOT NULL REFERENCES products (id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (id),
  action     TEXT    NOT NULL,
  ref_id     TEXT    NOT NULL,
  points     INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, action, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON points_ledger (user_id);
`;
