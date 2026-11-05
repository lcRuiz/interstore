# cart-web

Pagina de producto, carrito optimista y puntos en el header.

## Decisiones
- `CartStore` (`features/cart/data-access/cart-store.ts`): snapshot por linea, cambio inmediato, llamada a la API y reconciliacion con el `Cart` del servidor (fuente de verdad). Si falla: rollback de la linea afectada, totales provisionales recalculados y aviso con mensaje propio por `code` (`OUT_OF_STOCK`, `QUANTITY_EXCEEDS_STOCK`, generico). Nunca se muestra el `message` del servidor.
- Serializacion: una cola `Subject` + `concatMap` por `productId`; productos distintos no se bloquean.
- La respuesta reemplaza el carrito solo si no quedan operaciones en vuelo (evita parpadeo con clics rapidos). Por eso el rollback es por linea y no un snapshot global (un snapshot global pisaria operaciones de otros productos).
- Puntos: `RewardsStore` (saldo desde `GET /api/me` y `rewards` de cada respuesta; `lastAward`). Nada es optimista; el cliente no calcula puntos.
- `ProductPage` muestra «+N puntos» solo tras agregar desde esa pagina; el header muestra el ultimo premio.

## Archivos
`features/cart/{data-access,ui/cart-line,pages/cart-page}`, `features/rewards/data-access`, `features/catalog/pages/product-page`, `shared/utils/https-url.ts` (extraido de `product-card`), `core/layout/shell` (contador y saldo), rutas `/products/:id` y `/cart`.

## API publica
- `CartStore`: `cart`, `totalItems`, `state` (LoadState), `notice`, `load()`, `add(product, qty)`, `setQuantity(id, qty)`, `remove(id)`, `isPending(id)`, `dismissNotice()`.
- `RewardsStore`: `balance`, `lastAward`, `load()`, `applyBalance(n)`, `applyRewards(r)`.
- `CatalogApi.getProduct(id)`.

## Supuestos y recortes
- SUPUESTO: contrato del carrito segun el encargo; backend aun no integrado (tests con `HttpTestingController`).
- RECORTE: sin checkout, sin favoritos, sin pruebas visuales.
- Limitacion: cambiar de usuario no recarga carrito/saldo (no hay selector aun).

## Como probar
`cd frontend && npx ng test --watch=false`. Integracion real: levantar el backend y navegar a `/`, `/products/1`, `/cart`.
