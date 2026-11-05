# orders-api: checkout y confirmación de pedido

## Propósito
Convertir el carrito del usuario en un pedido confirmado, descontar stock y otorgar puntos `PURCHASE`, de forma idempotente y atómica.

## Endpoints
- `POST /api/orders`: sin body; header obligatorio `Idempotency-Key` (8-64, `[A-Za-z0-9_-]`). `201 { data: Order, rewards: { awarded, balance } }`. Replay (misma clave del mismo usuario): `200` con el pedido original y `rewards.awarded = 0`.
- `GET /api/orders/:id`: `200 { data: Order }`; `404 ORDER_NOT_FOUND` si no existe o es de otro usuario (filtrado por dueño en la consulta).
- Errores: `400 VALIDATION_ERROR`, `401`, `409 EMPTY_CART`, `409 OUT_OF_STOCK` (`details.productId`), `409 QUANTITY_EXCEEDS_STOCK` (`details.productId`, `details.available`).

Detalle y esquemas en `backend/openapi.yaml`.

## Decisiones
- Una transacción `BEGIN IMMEDIATE`: replay -> leer carrito -> validar TODAS las líneas -> `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?` -> pedido + líneas (copia de nombre y precio) -> ledger `PURCHASE` -> vaciar carrito. Cualquier fallo revierte todo.
- Precios, total y puntos salen siempre del servidor; el usuario, de la sesión. Un body con campos es 400.
- Puntos: `floor(unitPrice × quantity × multiplicador / 10_000)` por línea (`purchasePoints` en `modules/rewards/rewards.ts`). Decisión del usuario que **reemplaza** la fórmula `/1000` del ADR 0001. Con 0 puntos no se inserta en el ledger (`CHECK points <> 0`).
- `pointsAwarded` del pedido se lee del ledger (`PURCHASE`, `ref_id` = id del pedido).

## Modelo de datos
Sin migraciones: usa `orders`, `order_items` y `points_ledger` de `0001_initial`.

## Fuera de alcance
Historial (`GET /api/orders`), pago, dirección, envío, cancelación y rate limiting.

## Cómo probar
`cd backend && npm test` (`tests/orders.*.test.ts`, SQLite `:memory:`).
