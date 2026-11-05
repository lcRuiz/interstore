# Auditoría de seguridad: orders-web

- Edición OWASP: Top 10:2025 (tabla de la skill; sin acceso a red, supuesto declarado).
- Alcance: `git diff origin/main` (14 archivos, 996 líneas añadidas, rama `feat/orders-web`; solo frontend).
- Metodología: `scan-diff.mjs --base origin/main` (sin coincidencias) + revisión manual de lo nuevo.
- Veredicto: **APROBADO** (sin hallazgos medios o superiores).

## Revisión manual por categoría

| Categoría | Resultado |
|---|---|
| A01 Control de acceso | El cliente no decide permisos; `GET /api/orders/:id` queda a cargo del servidor (propiedad del pedido). **Riesgo del backend:** debe responder 404 `ORDER_NOT_FOUND` para pedidos de otro usuario (anti-IDOR). |
| A02 Configuración | `Idempotency-Key` y `X-User-Id` solo se envían a URLs `/api` (`OrdersApi` usa `API_BASE_URL`; el interceptor de usuario filtra por prefijo). Sin cambios de build/CSP. |
| A03 Cadena de suministro | Sin dependencias nuevas. |
| A04 Criptografía | La clave de idempotencia usa `crypto.randomUUID()` (CSPRNG). No es un secreto. |
| A05 Inyección / XSS | Todo se renderiza por interpolación (nombres de producto del servidor escapados); sin `innerHTML`, `bypassSecurityTrust*` ni URLs dinámicas. `:id` validado con `^[1-9]\d*$` + `isSafeInteger` antes de armar la URL. |
| A06 Diseño inseguro | Doble envío mitigado en el store (guarda `submittingState`) y en el botón; clave conservada solo para red/5xx. Totales y puntos nunca se calculan en el cliente. |
| A08 Integridad | Sin lógica de precios/puntos en cliente. |
| A09 Logging | Sin `console.*`, sin datos sensibles. |
| A10 Excepciones | Errores mapeados por `code` a mensajes propios; nunca se muestra el `message` del servidor. Fallo de red no deja el store bloqueado (`submitting` vuelve a false). |

## Hallazgos

| ID | Severidad | Detalle | Estado |
|---|---|---|---|
| SEC-orders-web-01 | Informativa | `crypto.randomUUID()` solo existe en contextos seguros (HTTPS/localhost); en HTTP plano sobre otro host lanzaría `TypeError` al confirmar. No aplica en dev ni en despliegue HTTPS. | Aceptado, sin cambio |
| SEC-orders-web-02 | Informativa | `order.id` del servidor se concatena en `navigateByUrl('/orders/' + id)`; es entero por contrato. | Aceptado |

Falsos positivos del script: ninguno. Reglas nuevas en `security-rules.md`: ninguna (SR-006 ya cubre el alcance de headers a `/api`).
