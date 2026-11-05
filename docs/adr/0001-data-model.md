# ADR 0001: Modelo de datos

- Estado: aprobado (2026-11-05)
- Alcance: `backend/` (SQLite vía `node:sqlite`)

## Contexto
Mini e-commerce con gamificación. Los requisitos fijan productos con paginación y filtro por categoría en el servidor, un saldo de puntos por usuario y reglas de puntos que viven en el servidor. El diseño (`design/`) muestra más cosas (variantes, reseñas, direcciones, canjes, envíos) que la prueba no pide.

## Decisión
Ocho tablas `STRICT`, migradas con `PRAGMA user_version`. La base de datos garantiza las reglas de negocio (puntos, stock, no duplicar compras) con `CHECK`, `UNIQUE` y triggers, en lugar de depender solo del código.

```
categories 1─┐
             └─< products >─┬─< cart_items  >─┐
                            ├─< favorites   >─┤
                            └─< order_items >─┼─ orders >─┐
                                              │           │
users ────────────────────────────────────────┴───────────┴─< points_ledger
```

### DDL de referencia (migración `0001_initial`)
```sql
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
```

## Razones
| # | Decisión | Alternativa descartada | Por qué |
|---|---|---|---|
| 1 | Ledger de solo inserción + saldo mantenido por trigger | Actualizar el saldo desde el servicio | El saldo siempre es la suma del ledger; el `CHECK >= 0` aborta un canje sin saldo; el historial de puntos sale del ledger |
| 2 | `UNIQUE(user_id, action, ref_id)` | Comprobarlo en el código | Impide sumar puntos repitiendo agregar/quitar; resiste peticiones concurrentes |
| 3 | `orders.idempotency_key` + `UNIQUE(user_id, key)` | Solo deshabilitar el botón | Un reintento no duplica el pedido aunque falle el cliente |
| 4 | `unit_price` y `product_name` copiados en `order_items` | Unir con `products` | El pedido conserva lo comprado si cambia el catálogo |
| 5 | Tabla `categories` con `slug` | `category TEXT` | Filtro por URL estable, FK contra errores de escritura, `/api/categories` desde la tabla |
| 6 | `search_name` sin tildes ni mayúsculas | `LOWER(name) LIKE` | `LOWER` de SQLite solo cubre ASCII; FTS5 queda como mejora |
| 7 | `points_multiplier` (1 o 2) | Calcular promociones en el cliente | El badge "Puntos x2" del diseño; la regla vive en el servidor |
| 8 | Carrito en el servidor sin tabla `carts` | Tabla `carts`/`quotes` (estilo Magento) | Un carrito implícito por usuario; el servidor necesita verlo para otorgar puntos; checkout atómico sin estado intermedio. Se introduciría con carritos de invitado, varios carritos, checkout multipaso o reservas de stock |
| 9 | Stock descontado en la compra, en una transacción | Reservar al agregar al carrito | Evita expirar reservas; `BEGIN IMMEDIATE` verifica, descuenta, crea el pedido y otorga puntos |
| 10 | Tablas `STRICT` | Tipos flexibles | Sin `STRICT`, `INTEGER` acepta `'abc'` |
| 11 | `WITHOUT ROWID` en claves compuestas | `rowid` + índice | Sin índice duplicado |
| 12 | Dinero en enteros (COP) | `REAL` | Sin errores de punto flotante |
| 13 | Fechas ISO 8601 UTC con milisegundos | `datetime('now')` | Orden correcto como texto, parseo sin ambigüedad |
| 14 | IDs enteros | UUID | Contra IDOR protege filtrar por dueño en cada consulta, no ocultar el id |
| 15 | Índices solo para consultas reales | Indexar "por si acaso" | Categoría+orden, historiales por usuario; carrito y favoritos ya cubiertos por su PK |
| 16 | `ref_id` genérico en el ledger, sin FK | Una columna nullable por tipo | Trade-off asumido: el `CHECK` sobre `action` acota el significado y el `UNIQUE` hace el trabajo |

## Reglas de puntos
| Acción | Puntos | Una sola vez por |
|---|---|---|
| `CART_ADD` | +10 | usuario y producto |
| `FAVORITE_ADD` | +5 | usuario y producto |
| `PURCHASE` | suma de `floor(subtotal_línea × multiplicador / 1000)` | pedido |

Quitar del carrito o desmarcar un favorito no resta puntos. Las reglas viven en el código (versionadas y con tests), no en una tabla de configuración.

## Fuera de alcance
Variantes (talla/color), reseñas, direcciones, pagos, estados de envío, canje de puntos (el ledger ya lo admite con un movimiento negativo), cancelación de pedidos con reversión de puntos, autenticación real y roles.

## Migración
No hay datos productivos. `0001_initial` contiene este modelo y reemplaza el esquema idempotente (`schema.ts`); la base local de demo se recrea con `npm run db:reset` (acción destructiva con confirmación). El seed combina los 12 productos del diseño con relleno hasta ~40.
