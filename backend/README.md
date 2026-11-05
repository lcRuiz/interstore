# Store — Backend

API REST del catálogo con sistema de recompensas.
Stack: **Node.js + Express 5 + TypeScript + SQLite** (`node:sqlite`) + **Zod**.

## Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | **22.16 o superior** (probado con 24.x) — incluye `node:sqlite` (opción `timeout` desde 22.16), no requiere compilar binarios nativos |
| npm | 10 o superior |

```bash
node --version
```

## Puesta en marcha

Desde la carpeta `backend/`:

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **(Opcional) Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Sin `.env` se usan los valores por defecto:

   | Variable | Por defecto | Descripción |
   |---|---|---|
   | `PORT` | `3000` | Puerto HTTP de la API |
   | `DB_PATH` | `data/store.db` | Ruta del archivo SQLite (`:memory:` para una base volátil) |
   | `CORS_ORIGIN` | `http://localhost:4200` | Origen permitido (frontend Angular) |

3. **Levantar en modo desarrollo** (recarga automática)

   ```bash
   npm run dev
   ```

   La API queda en `http://localhost:3000`. Al arrancar se crea la base de datos y, si está vacía, se aplican las migraciones pendientes y, si no hay productos, se cargan los datos de demo (40 productos en 3 categorías —12 del diseño más relleno— y 2 usuarios).

4. **Verificar**

   ```bash
   curl http://localhost:3000/api/health
   ```

   ```bash
   curl -H "X-User-Id: 1" http://localhost:3000/api/me
   ```

   ```bash
   curl -H "X-User-Id: 1" "http://localhost:3000/api/products?page=1&pageSize=10&category=ropa&q=merino&sort=price"
   ```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor en modo desarrollo con `tsx watch` |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm start` | Ejecuta la versión compilada (requiere `npm run build`) |
| `npm test` | Ejecuta la suite de tests (Vitest + supertest, base en memoria) |
| `npm run test:watch` | Tests en modo watch |
| `npm run typecheck` | Verificación de tipos sin emitir archivos |
| `npm run db:reset` | **Borra** la base local (`DB_PATH`) y la recrea migrada y con datos de demo |

## Usuarios de demo

La prueba no exige autenticación, así que se simula con el header `X-User-Id`:

| `X-User-Id` | Usuario |
|---|---|
| `1` | Ana Demo |
| `2` | Carlos Demo |

Las rutas que requieren usuario responden `401` si el header falta o el usuario no existe.

## Endpoints disponibles

| Método | Ruta | Usuario | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | No | Estado de la API |
| `GET` | `/api/me` | Sí | Perfil y saldo de puntos del usuario actual |
| `GET` | `/api/products` | Sí | Catálogo paginado: `page`, `pageSize` (1–50), `category` (slug), `q` (≤ 80), `sort` (`name`\|`price`\|`newest`) |
| `GET` | `/api/products/:id` | Sí | Detalle de un producto (`404 PRODUCT_NOT_FOUND`) |
| `GET` | `/api/categories` | Sí | Categorías (`slug`, `name`) |
| `GET` | `/api/cart` | Sí | Carrito del usuario: `items`, `totalItems`, `total` (calculados en el servidor) |
| `POST` | `/api/cart/items` | Sí | Agrega `{ productId, quantity? }` (suma si ya existe); `+10` puntos la primera vez por producto; `404 PRODUCT_NOT_FOUND`, `409 OUT_OF_STOCK`\|`QUANTITY_EXCEEDS_STOCK` |
| `PATCH` | `/api/cart/items/:productId` | Sí | Fija la cantidad (1–99, ≤ stock); nunca da puntos; `404 CART_ITEM_NOT_FOUND` |
| `DELETE` | `/api/cart/items/:productId` | Sí | Quita la línea (idempotente); no resta puntos |

Contrato completo en [`openapi.yaml`](openapi.yaml); detalle de la feature en `docs/features/products-api.md`.

Todas las respuestas exitosas usan `{ "data": ... }`. Los errores siempre tienen la forma:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos de entrada inválidos", "details": [] } }
```

## Base de datos y migraciones

El esquema vive en migraciones versionadas (`src/db/migrations/NNNN_nombre.ts`, registradas en `src/db/migrate.ts`). La versión aplicada se guarda en `PRAGMA user_version`; al abrir la base se aplican, en orden y cada una en su transacción, las que falten. Una migración ya aplicada **no se edita**: se agrega otra. La `0001_initial` contiene el modelo completo (`docs/adr/0001-data-model.md`).

- **Base nueva:** `npm run dev` la crea, migra y siembra.
- **Base creada con el esquema anterior (antes de `products-api`):** no es compatible. Haz un backup de `data/store.db` si te interesa y ejecuta `npm run db:reset` con el servidor detenido.
- **Probar sin tocar tu base:** `DB_PATH=/ruta/temporal/store.db npm run dev`.

## Estructura

```
src/
├── app.ts            createApp({ db }): construye la app (inyectable en tests)
├── server.ts         arranque: abre la base, carga datos de demo y escucha
├── config.ts         variables de entorno validadas con Zod
├── db/               conexión, migraciones versionadas, transacciones, seed y reset
├── errors/           AppError y manejador centralizado de errores
├── middleware/       validación (withValidation) y usuario actual (X-User-Id)
└── modules/          un módulo por recurso: repository + routes
tests/                tests de integración con base en memoria
```

## Problemas comunes

- **`Error: listen EADDRINUSE :::3000`** — el puerto está ocupado. Define otro en `.env` (`PORT=3001`) o detén el proceso que lo usa.
- **`Cannot find module 'node:sqlite'`** — la versión de Node es anterior a 22.16. Actualiza Node.
- **Datos inconsistentes tras probar** — ejecuta `npm run db:reset` (con el servidor detenido).
- **`no such column: category_id` o `La base tiene user_version=…`** — la base de archivo es de una versión anterior del esquema: recréala con `npm run db:reset`.
- **Imágenes de productos no cargan** — se sirven desde `picsum.photos`; requieren conexión a internet.
