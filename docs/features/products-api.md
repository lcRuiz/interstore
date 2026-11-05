# Catálogo de productos (API)

> Estado: implementada · Rama: `feat/products-api` · PR: pendiente (sin remoto) · Última actualización: 2026-11-05

## Propósito
Expone el catálogo: listado de productos con paginación, filtro por categoría, búsqueda y orden **resueltos en el servidor**, detalle de producto y categorías. Introduce además el modelo de datos definitivo (ADR 0001) mediante migraciones versionadas, sobre el que se montarán carrito, favoritos, compra y puntos.

Requerimientos cubiertos: paginación/filtros/orden en servidor, DTO sin columnas internas, `X-User-Id` obligatorio, precios en COP enteros.

## Endpoints
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/products` | `X-User-Id` | Lista paginada con filtros |
| GET | `/api/products/:id` | `X-User-Id` | Detalle de un producto |
| GET | `/api/categories` | `X-User-Id` | Categorías (slug, nombre) |

Contrato completo en `backend/openapi.yaml`.

### `GET /api/products`
- Query:
  | Parámetro | Regla | Default |
  |---|---|---|
  | `page` | entero 1–1 000 000 | 1 |
  | `pageSize` | entero 1–50 | 12 |
  | `category` | slug `[a-z0-9-]{1,50}` | (todas) |
  | `q` | texto recortado, máx. 80; sin distinguir mayúsculas ni tildes; `%` `_` `\` literales | (sin filtro) |
  | `sort` | `name` \| `price` \| `newest` | `newest` |
- 200: `{ data: Product[], meta: { page, pageSize, total, totalPages } }`
- `Product`: `{ id, name, price, imageUrl, stock, pointsMultiplier, category: { slug, name } }`
- Orden (siempre con desempate por `id`): `name` = nombre sin tildes/mayúsculas ascendente; `price` = menor a mayor; `newest` = `created_at` descendente.
- Errores: `400 VALIDATION_ERROR`, `401 MISSING_USER | UNKNOWN_USER`, `400 INVALID_USER_ID`.

### `GET /api/products/:id`
- 200 `{ data: Product }` · `404 PRODUCT_NOT_FOUND` · `400 VALIDATION_ERROR` si el id no es un entero positivo decimal (`1e3`, `0x10`, `1.5`, `0`, `-1` se rechazan).

### `GET /api/categories`
- 200 `{ data: [{ slug, name }] }` ordenado por nombre.

## Modelo de datos
Modelo completo en `docs/adr/0001-data-model.md` (8 tablas `STRICT`: `categories`, `products`, `users`, `cart_items`, `favorites`, `orders`, `order_items`, `points_ledger`). Esta feature **solo lee** `categories` y `products`; el resto existe como esquema.

Lo que usan las consultas del catálogo:
| Tabla | Columna | Uso |
|---|---|---|
| `products` | `search_name` | texto normalizado (minúsculas, sin tildes) contra el que se hace `LIKE`; **no se expone** |
| `products` | `created_at` | orden `newest`; ISO 8601 UTC con milisegundos |
| `products` | `points_multiplier` | 1 o 2 (`CHECK`); sale como `pointsMultiplier` |
| `categories` | `slug` | filtro estable por URL |

Índices: `idx_products_category (category_id, id)` para el filtro por categoría. No se indexa `price`/`search_name`: con `LIKE '%…%'` un índice no ayuda y el catálogo es pequeño (ver Limitaciones).

## Migraciones
| Migración | Cambio | Reversible | Rollback |
|---|---|---|---|
| `0001_initial` | crea las 8 tablas, 3 índices y 3 triggers del ledger | no (sin datos productivos) | restaurar el backup de `backend/data/store.db` o recrear con `npm run db:reset` |

Mecanismo (`backend/src/db/migrate.ts`): `PRAGMA user_version` guarda la versión; cada migración pendiente corre en su propia transacción (`BEGIN IMMEDIATE`) junto con la actualización de `user_version`, de modo que un fallo no deja nada a medias. Una base con `user_version` mayor que la última migración conocida se rechaza al arrancar. **Una migración aplicada no se edita: se agrega otra.** `openDatabase()` activa `foreign_keys` en cada conexión y, en archivo, WAL y `busy_timeout` de 5 s.

**Cambio incompatible para la base local:** el esquema idempotente anterior (`schema.ts`, `products.category TEXT`) se eliminó. Una base de archivo creada antes de esta feature no es compatible: hay que recrearla (ver "Cómo probar y ejecutar").

## Errores
| Code | Status | Cuándo |
|---|---|---|
| `MISSING_USER` | 401 | falta `X-User-Id` |
| `INVALID_USER_ID` | 400 | `X-User-Id` no es un entero positivo |
| `UNKNOWN_USER` | 401 | el usuario no existe |
| `VALIDATION_ERROR` | 400 | query o `:id` inválidos; `details` lista `{ location, path, message }` |
| `PRODUCT_NOT_FOUND` | 404 | el id no existe |
| `ROUTE_NOT_FOUND` | 404 | ruta o método no registrados (p. ej. `POST /api/products`) |
| `INTERNAL_ERROR` | 500 | error inesperado; cuerpo genérico, sin stack ni SQL |

## Decisiones de diseño
| Decisión | Alternativas | Por qué |
|---|---|---|
| Categoría inexistente → 200 con `data: []` | 404 / 400 | el filtro es un criterio de búsqueda, no un recurso; el cliente no necesita distinguir. Un slug con formato inválido sí es 400 |
| Página fuera de rango → 200 con `data: []` y `meta` real | 404 / 400 | el cliente decide qué mostrar; `page` tiene tope 1 000 000 para evitar un `OFFSET` desbordado |
| `sort=name` ordena por `search_name` | por `name` binario | el orden binario de SQLite pone "Árbol" después de "Zapato" |
| `sort` por defecto `newest` | `name` | catálogo de novedades; sin parámetro de dirección (YAGNI) |
| `ORDER BY` desde un mapa constante | interpolar `sort` | los identificadores no se parametrizan; solo se elige una cadena fija |
| `LIKE ? ESCAPE '\'` con `%` `_` `\` escapados | `LIKE` directo | comodines del usuario no deben cambiar el significado |
| `normalizeSearch` compartida (seed + repositorio) | `LOWER()` en SQL | `LOWER` de SQLite solo cubre ASCII |
| Parámetros de query desconocidos se ignoran | 400 | tolerante con clientes; no hay mass assignment porque la ruta no escribe |
| Sentencias preparadas cacheadas por variante de SQL | preparar en cada petición | las variantes son finitas (filtros × 3 órdenes) |

## Seguridad
Ver `docs/security/products-api-audit.md`. Resumen: SQL parametrizado, `ORDER BY` en lista blanca, `LIKE` escapado, límites (`pageSize` ≤ 50, `q` ≤ 80, `page` ≤ 1 000 000), DTO explícito, 500 genérico. `X-User-Id` es una sesión simulada (riesgo aceptado, informativo).

## Limitaciones
- Concurrencia de SQLite: un único escritor. Esta feature solo lee; las lecturas concurrentes funcionan con WAL. Multi-proceso o escalado horizontal exigirían otro motor.
- `LIKE '%q%'` recorre la tabla (sin índice). Con ~40 filas es irrelevante; para un catálogo grande, FTS5 (mejora anotada en el ADR).
- El orden (`price`, `newest`, `name`) no tiene índice propio. `EXPLAIN QUERY PLAN` sobre el seed (2026-11-05) muestra `SEARCH p USING INDEX idx_products_category` para el filtro por categoría y `USE TEMP B-TREE FOR ORDER BY` en las tres variantes (sin filtro: `SCAN p USING INDEX idx_products_category`): ordena en memoria. Con ~40 filas es irrelevante. Señal para indexar: un catálogo de decenas de miles de filas o `sort` lento; el candidato es un índice compuesto por el orden más usado (p. ej. `(category_id, price, id)`), en una migración nueva.
- `total` y la página son dos lecturas consecutivas sin transacción; en una escritura concurrente (no existe en esta feature) podrían diferir en una fila.
- Las imágenes son URLs de `picsum.photos` (requieren internet).
- El empate por `id` es contractual; SQLite ya recorre por `rowid`, por lo que un test no distingue su ausencia.

## Supuestos
- SUPUESTO: precios del diseño × 1000 (COP enteros), `badge: 'Agotado'` → `stock = 0`, `x2: true` → `points_multiplier = 2`.
- SUPUESTO: identidad por `X-User-Id` (sin autenticación real).
- SUPUESTO: la base local `data/store.db` se puede recrear (no hay datos productivos).
- SUPUESTO: Node ≥ 22.16 (opción `timeout` de `node:sqlite`); `node:sqlite` figura como "release candidate" en la documentación actual de Node.

## Cómo probar y ejecutar
```bash
cd backend
npm run typecheck && npm test && npm run build

# Base de archivo ya existente con el esquema anterior: se debe recrear.
# `npm run db:reset` BORRA backend/data/store.db (haz un backup antes si te interesa).
npm run db:reset
npm run dev

curl -H "X-User-Id: 1" "http://localhost:3000/api/products?page=1&pageSize=10&category=ropa&q=merino&sort=price"
curl -H "X-User-Id: 1" http://localhost:3000/api/products/1
curl -H "X-User-Id: 1" http://localhost:3000/api/categories
```
Sin tocar `data/store.db`: `DB_PATH=/ruta/temporal/store.db npm run dev` crea y siembra una base nueva en esa ruta.
