# Auditoria de seguridad: cart-web

- Fecha: 2026-11-05. Base: `origin/main` (8165c1a). Edicion: OWASP Top 10:2025 (tabla de la skill; sin verificar en red, supuesto).
- Alcance: diff de la rama `feat/cart-web` (frontend: cart, rewards, product-page, shell, product-card, catalog-page, `shared/utils/https-url.ts`). Auditoria breve por presupuesto: `scan-diff.mjs` + revision manual solo de lo nuevo.
- Iteraciones de remediacion: 0/3.

## Resultado
| ID | Cat. | Sev. | Hallazgo | Estado |
|---|---|---|---|---|
| (scan) client-authz en `cart-line.html:18` | A01 | informativa | Coincidencia por `role="group"` + `aria-label`; no hay autorizacion en cliente | Falso positivo |
| SEC-cart-web-01 | A01 | informativa | El carrito, el saldo y los puntos dependen de `X-User-Id` sin autenticacion real (supuesto del repo). La autorizacion y el limite de puntos (+10 una vez por producto) viven en el servidor | Riesgo del backend / supuesto vigente |
| SEC-cart-web-02 | A10 | baja | `RewardsStore.load()` ignora el error: el indicador de saldo queda oculto sin aviso | Aceptado (degradacion segura, sin fuga) |
| SEC-cart-web-03 | A06 | baja | Cambiar de usuario en `Session` no recarga carrito ni saldo (no existe UI para cambiar de usuario en esta feature) | Abierto, informativo; atender si se agrega selector |

Sin hallazgos critical/alto/medio.

## Revision manual (lo verificado)
- XSS (A05): sin `innerHTML`, `bypassSecurityTrust*` ni URLs dinamicas en `href`. Nombres y mensajes se interpolan (escapados). Imagenes: solo `https:` via `httpsUrlOrNull` (SR-002) en tarjeta, linea y detalle.
- Parametros: `:id` validado con `/^[1-9]\d*$/` y `isSafeInteger` antes de la peticion; `productId` en URLs de la API proviene de numeros del store. Cantidades validadas 1..99 enteras en el store antes de enviar.
- Errores (A10): los avisos usan mensajes propios por `code`; nunca se renderiza el `message` del servidor. 404 de id invalido se sintetiza en cliente.
- Puntos/precios: el cliente no los calcula; los totales optimistas son provisionales y se reemplazan por la respuesta.
- Sin dependencias nuevas (A03), sin almacenamiento en navegador, sin logs, sin secretos.

## Reglas
Sin reglas nuevas ni refinadas (ningun patron nuevo; se reutiliza SR-002).

## Veredicto: APROBADO
