# Auditoría de seguridad: cart-api (breve)

- Edición: OWASP Top 10:2025 (supuesto: lista de la skill, sin consulta web). Base: `origin/main` (8165c1a). Fecha: 2026-11-05.
- Alcance: 10 archivos del diff de código (módulos `cart` y `rewards`, `app.ts`, export de `toProductDto`, OpenAPI, tests). Sin migraciones, sin cambios de `package.json`/lockfile (no aplica `npm audit` del delta).
- Método: `scan-diff.mjs` (1 coincidencia, falso positivo: `SELECT` de un test acotado a un usuario) + revisión manual de los flujos `req -> SQL -> respuesta`.

## Revisión manual
| Tema | Resultado |
|---|---|
| A05 Inyección | Todo el SQL es parametrizado (SRB-001); sin identificadores dinámicos. `:productId` con regex decimal (SRB-007). |
| A01 BOLA/IDOR | Todas las consultas de líneas filtran por `user_id` de la sesión; no hay `userId` en body ni ruta (SRB-003, SRB-012). Test de aislamiento entre usuarios. |
| A01 Mass assignment | `z.strictObject`: `points`, `userId`, `awarded`, `price` -> 400 (SRB-004). Precio y totales salen de `products.price`. |
| A06 Abuso de la regla de puntos | Ledger `UNIQUE(user_id, action, ref_id)` + `ON CONFLICT DO NOTHING`; `awarded` por `changes`; tope natural 10 pts por producto; PATCH/DELETE nunca otorgan. Sin TOCTOU: transacción `BEGIN IMMEDIATE` (SRB-011). |
| A10 Excepciones | Fallo del ledger revierte la línea (test); 500 genérico sin SQL ni stack (test). |
| A02/A09 | Sin logs nuevos; sin config nueva. |

## Hallazgos
Ninguno crítico, alto ni medio.

| ID | Sev. | Detalle |
|---|---|---|
| INFO-1 | Informativa | `X-User-Id` es sesión simulada (suplantable); aceptado en el repo (SRB-012). |
| INFO-2 | Informativa | Sin rate limiting (recorte acordado). El abuso está acotado por el ledger y por `PRIMARY KEY(user_id, product_id)` (carrito <= tamaño del catálogo). |

## Reglas
Sin reglas nuevas ni refinadas (los patrones usados ya están cubiertos por SRB-001/003/004/007/011/012).

## Veredicto: APROBADO
