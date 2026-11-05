# cart-api

Carrito en el servidor con puntos por agregar al carrito. Contrato en `backend/openapi.yaml`.

## Endpoints (todos con `X-User-Id`)
- `GET /api/cart` -> `{ data: Cart }`
- `POST /api/cart/items` `{ productId, quantity? = 1 }` -> `{ data: Cart, rewards: { awarded, balance } }`
- `PATCH /api/cart/items/:productId` `{ quantity }` -> igual, `awarded` siempre 0; 404 `CART_ITEM_NOT_FOUND`
- `DELETE /api/cart/items/:productId` -> igual; idempotente
- Errores: 400 `VALIDATION_ERROR` (body `strict`: campos extra rechazados), 404 `PRODUCT_NOT_FOUND`, 409 `OUT_OF_STOCK`, 409 `QUANTITY_EXCEEDS_STOCK` (`details.available`).

## Decisiones
- El usuario sale solo de la sesión (`X-User-Id`); nunca del body ni de la ruta. Todo el SQL de líneas filtra por `user_id`.
- `Cart.total` y `lineTotal` se calculan en el servidor con `products.price`.
- `CART_ADD` = `CART_ADD_POINTS` = 10 (`modules/rewards/rewards.ts`). Se inserta en `points_ledger` con `ON CONFLICT(user_id, action, ref_id) DO NOTHING`; `awarded = changes > 0 ? 10 : 0`. El trigger suma al saldo. Idempotente: tope natural de 10 puntos por producto; quitar del carrito no resta.
- Una transacción (`BEGIN IMMEDIATE`) por escritura: validación, upsert y ledger. Si el ledger falla no queda línea.
- La cantidad resultante debe ser <= min(99, stock); si no, 409 `QUANTITY_EXCEEDS_STOCK` con `available = min(99, stock)`. PATCH sobre producto con stock 0 -> `OUT_OF_STOCK`.
- Sin migración nueva (esquema `0001_initial`).

## Probar
`cd backend; npm test` (tests: `tests/cart.routes.test.ts`, `tests/cart.service.test.ts`; SQLite `:memory:`).

## Limitaciones
`X-User-Id` es una sesión simulada (suplantable). Un solo escritor SQLite; sin rate limiting.
