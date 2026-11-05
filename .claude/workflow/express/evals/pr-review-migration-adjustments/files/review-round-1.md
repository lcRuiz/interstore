# Revisión ronda 1, PR #31 (feat(orders): add checkout endpoint)

| ID | Nivel | Ubicación | Comentario |
|---|---|---|---|
| B1 | bloqueante | backend/src/db/migrations/0003_orders_status.ts:8 | Agrega orders.status TEXT NOT NULL sin DEFAULT: falla en bases con pedidos existentes y el PR no trae plan de rollback. |
| S1 | sugerencia | backend/src/modules/orders/orders.repository.ts:22 | La consulta de pedidos por usuario hace SCAN de orders: falta un índice en orders(user_id). |
| N1 | nit | backend/src/modules/orders/orders.service.ts:40 | Renombrar `tx` a `runInTransaction`. |
