# Auditoría de seguridad: orders-api

- Fecha: 2026-11-05. Edición: OWASP Top 10:2025 (supuesto declarado, sin verificación en red).
- Alcance: diff contra `origin/main` (10 archivos: `modules/orders/*`, `rewards.ts`, `app.ts`, `openapi.yaml`, 3 tests). Sin migraciones, sin cambios de dependencias (no se ejecutó `npm audit`; `package*.json` no cambió).
- Metodología: `scan-diff.mjs --base origin/main` (2 coincidencias) + revisión manual de cada flujo `req.* -> SQL -> respuesta`.

## Veredicto: APROBADO (sin hallazgos de severidad media o superior)

## Revisión por categoría
| Cat. | Resultado |
|---|---|
| A01 Access Control | `GET /:id` consulta `WHERE id = ? AND user_id = ?` y responde 404 (no 403) para pedidos ajenos; la clave de idempotencia se busca por `(user_id, key)`. El usuario sale de `requireUser`; no hay `userId` en body/ruta. Test [9] y [2]. |
| A05 Injection | Todo el SQL de `orders.repository.ts` es parametrizado y de texto constante. El id de ruta pasa por regex decimal; la clave por `^[A-Za-z0-9_-]{8,64}$`. |
| A06 Insecure Design | Precios, total y puntos solo del servidor; body con campos -> 400 (`strictObject`). Replay idempotente y `UNIQUE(user_id, action, ref_id)` impiden duplicar puntos. Stock con `UPDATE ... AND stock >= ?` + verificación de `changes` dentro de `BEGIN IMMEDIATE`. Tests [1], [4], [6], [7], [11]. |
| A09 Logging | No se registra la clave ni cabeceras; el handler central existente no loguea bodies. |
| A10 Exceptional Conditions | Checkout atómico: fallo en ledger/ítems/stock revierte pedido, stock y carrito ([12]). 500 genérico sin SQL ni stack (test HTTP). |

## Hallazgos
| ID | Sev. | Detalle | Estado |
|---|---|---|---|
| (scan) tests/orders.service.test.ts:31,49 | falso positivo | Interpolación del id numérico devuelto por la factory en SQL de ASSERT de tests; no es entrada de usuario ni código de producción. | Descartado |
| SEC-orders-api-01 | informativa | Sin rate limiting en `POST /api/orders` (fuera de alcance por decisión). El abuso queda acotado por idempotencia, stock y carrito vacío tras comprar. | Aceptado/pendiente |
| SEC-orders-api-02 | informativa | `X-User-Id` es una sesión simulada: cualquier cliente puede suplantar a otro (SRB-012, riesgo ya documentado). | Preexistente |
| SEC-orders-api-03 | informativa | Una clave reutilizada tras volver a llenar el carrito devuelve el pedido original (sin comparar contenido); es correcto porque la petición no tiene payload. | Por diseño |

## Riesgo residual y reglas
Concurrencia: SQLite con un único escritor (proceso único); `BEGIN IMMEDIATE` serializa checkouts. Multiproceso exigiría revisar. Regla SRB-007 refinada con el patrón de checkout idempotente.
