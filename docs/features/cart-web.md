# cart-web

Página de producto, carrito optimista y puntos en el header.

## Decisiones
- `CartStore` (`features/cart/data-access/cart-store.ts`): copia de la línea antes del cambio, cambio inmediato, llamada a la API y reconciliación con el `Cart` del servidor (fuente de verdad). Si falla: se deshace la línea afectada, los totales provisionales se recalculan y se muestra un aviso con mensaje propio según el `code` (`OUT_OF_STOCK`, `QUANTITY_EXCEEDS_STOCK` o uno genérico). Nunca se muestra el `message` del servidor.
- Serialización: una cola `Subject` + `concatMap` por `productId`; productos distintos no se bloquean entre sí.
- La respuesta reemplaza el carrito solo si no quedan operaciones en vuelo, para evitar parpadeos con clics rápidos. Por eso el rollback es por línea y no una copia global: una copia global pisaría operaciones en curso de otros productos.
- Puntos: `RewardsStore` (saldo desde `GET /api/me` y `rewards` de cada respuesta; `lastAward`). Nada es optimista y el cliente no calcula puntos.
- `ProductPage` muestra «+N puntos» solo tras agregar desde esa página; el header muestra el último premio.

## Archivos
`features/cart/{data-access,ui/cart-line,pages/cart-page}`, `features/rewards/data-access`, `features/catalog/pages/product-page`, `shared/utils/https-url.ts` (extraído de `product-card`), `core/layout/shell` (contador y saldo) y las rutas `/products/:id` y `/cart`.

## API pública
- `CartStore`: `cart`, `totalItems`, `state` (LoadState), `notice`, `load()`, `add(product, qty)`, `setQuantity(id, qty)`, `remove(id)`, `isPending(id)`, `dismissNotice()`. Más adelante, el checkout (`orders-web`) sumó `hasPending` y `clear()`.
- `RewardsStore`: `balance`, `lastAward`, `load()`, `applyBalance(n)`, `applyRewards(r)`.
- `CatalogApi.getProduct(id)`.

## Relación con otras funcionalidades
- El contrato del carrito se acordó antes de tener el backend y esta parte se escribió contra `HttpTestingController`. Hoy está integrado con la API real (`docs/features/cart-api.md`).
- El botón «Confirmar pedido» de `/cart` y la página `/orders/:id` no pertenecen a esta funcionalidad: los agregó `orders-web` (`docs/features/orders-web.md`).

## Verificación
Además de las pruebas automáticas, se comprobó a mano en el navegador contra la API real:
- Al agregar desde la tarjeta, el contador sube de inmediato y el saldo de puntos solo cambia cuando responde el servidor («+10 puntos»). Agregar otra vez el mismo producto sube las unidades y no suma puntos.
- En la página de producto, el selector de cantidad llega hasta el stock real, el producto agotado tiene el botón deshabilitado, un id inexistente muestra «Producto no encontrado» y un id inválido no llama a la API.
- Los totales del carrito coinciden con los de `GET /api/cart`.
- Con el backend detenido, aumentar una cantidad se deshace (cantidad, total y puntos quedan igual) y aparece un aviso propio.

## Supuestos y recortes
- RECORTE: sin favoritos.
- RECORTE: sin pruebas visuales automatizadas; la verificación visual contra la API real es manual.
- Limitación: cambiar de usuario en `Session` no recarga el carrito ni el saldo (todavía no hay selector de usuario).

## Cómo probar
`cd frontend && npx ng test --watch=false`. Para probarlo de punta a punta, levantar la API y el cliente como indica el README de la raíz y navegar a `/`, `/products/1` y `/cart`.
