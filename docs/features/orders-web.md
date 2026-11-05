# orders-web: checkout y confirmación de pedido

## Propósito
Convertir el carrito en un pedido desde `/cart` y mostrar la confirmación en `/orders/:id` con los puntos que otorgó el servidor.

## Decisiones de diseño
- **Checkout no optimista.** Es sensible: el botón muestra «Confirmando…» y espera al servidor, que calcula totales y puntos.
- **Idempotencia.** `OrdersStore` genera una `Idempotency-Key` (`crypto.randomUUID()`) por intento. Se conserva ante red/5xx para reintentar (si el primer POST sí se procesó, el servidor devuelve el pedido original con 200) y se descarta tras el éxito. SUPUESTO: también se descarta tras un 4xx definitivo (stock, carrito vacío) porque el carrito cambió y el siguiente clic es una intención nueva.
- **Anti doble envío** en dos capas: guarda `submitting` en el store y botón deshabilitado (también con operaciones del carrito en vuelo, `CartStore.hasPending`).
- **Premio.** Se aplica `rewards.balance` del servidor y `order.pointsAwarded` como último premio (en un replay `rewards.awarded` es 0).
- **Errores** con mensaje propio por `code`; `OUT_OF_STOCK`/`QUANTITY_EXCEEDS_STOCK`/`EMPTY_CART` recargan el carrito (`GET /api/cart`).
- **Página de confirmación** autosuficiente: carga `GET /api/orders/:id`, valida el id antes de llamar y sirve tras recargar.
- RECORTE: sin historial de pedidos, pago, dirección ni envío.

## Estructura
```
features/orders/
├── data-access/  orders.types.ts, orders-api.ts, orders-store.ts
└── pages/order-page/
features/cart/  CartStore.clear() y hasPending; botón en cart-page
```

## API pública
- `OrdersStore.checkout()`, `submitting`, `notice`, `canRetry`, `dismissNotice()`.
- `OrdersApi.createOrder(key)` (`POST /api/orders`), `getOrder(id)` (`GET /api/orders/:id`).
- `CartStore.clear()`, `CartStore.hasPending`.
- Ruta lazy `orders/:id` -> `OrderPage`.

## Flujos
1. Clic -> POST con header -> 201/200 -> carrito vacío, saldo aplicado, navegación.
2. Red/5xx -> aviso + «Reintentar pedido» con la misma clave.
3. Stock/carrito vacío -> aviso + recarga del carrito.

## Cómo probar
`cd frontend && npx ng test --watch=false` (specs: `orders-store`, `order-page`, `cart-page`). Falta la integración real con el backend de pedidos.
