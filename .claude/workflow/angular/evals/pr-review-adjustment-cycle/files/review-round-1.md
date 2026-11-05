# Revisión ronda 1, PR #14 (feat(cart): add optimistic cart)

| ID | Nivel | Ubicación | Comentario |
|---|---|---|---|
| B1 | bloqueante | frontend/src/app/features/cart/data-access/cart-store.ts:58 | El rollback restaura items pero no total: tras un 409 la UI muestra un total incorrecto. |
| S1 | sugerencia | frontend/src/app/features/cart/ui/cart-line/cart-line.html:12 | El botón de quitar solo tiene ícono: falta aria-label. |
| N1 | nit | frontend/src/app/features/cart/data-access/cart-store.ts:20 | Renombrar `snap` a `snapshot`. |
