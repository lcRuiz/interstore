# Reglas de codificación segura (frontend Angular)

Archivo vivo. **`angular-sec` lo escribe; `angular-develop` lo lee antes de implementar.** Cada regla nace de una auditoría (o de la línea base inicial) y se refina en lugar de duplicarse.

Formato: ID · categoría OWASP (edición usada) · regla "haz X, evita Y porque Z" · ejemplo incorrecto/correcto mínimo · origen. Sin secretos ni datos reales.

Índice:
| ID | Categoría | Tema |
|---|---|---|
| SR-001 | A05:2025 Injection | HTML dinámico y `DomSanitizer` |
| SR-002 | A05:2025 Injection | URLs dinámicas en `[href]`/`[src]` |
| SR-003 | A01:2025 Broken Access Control | Guards y autorización |
| SR-004 | A04:2025 Cryptographic Failures | Tokens y secretos en el cliente |
| SR-005 | A01:2025 Broken Access Control | Open redirect con `returnUrl` |
| SR-006 | A02:2025 Security Misconfiguration | Headers de identidad a terceros |
| SR-007 | A09:2025 Security Logging and Alerting Failures | Datos sensibles en logs y errores |
| SR-008 | A03:2025 Software Supply Chain Failures | Dependencias nuevas |
| SR-009 | A10:2025 Mishandling of Exceptional Conditions | Errores no manejados y estados inconsistentes |
| SR-010 | A05:2025 Injection | Parámetros de la URL hacia la API |

---

### SR-001 · A05:2025 Injection · HTML dinámico
**Regla:** renderiza datos externos con interpolación (`{{ }}`) o bindings de propiedad; evita `[innerHTML]` con datos no confiables y **nunca** uses `bypassSecurityTrustHtml/Script/Url/ResourceUrl` sobre datos que vengan del usuario o de la API, porque desactivan el sanitizador de Angular y abren la puerta a XSS.
```html
<!-- Incorrecto -->
<div [innerHTML]="trusted"></div> <!-- trusted = sanitizer.bypassSecurityTrustHtml(api.description) -->
<!-- Correcto -->
<p>{{ product.description }}</p>
```
Si de verdad hace falta HTML enriquecido: sanitízalo en el servidor y deja que Angular vuelva a sanitizar con `[innerHTML]` (sin bypass), y documenta la excepción.
**Origen:** línea base, 2026-11-05.

### SR-002 · A05:2025 Injection · URLs dinámicas
**Regla:** construye enlaces internos con `routerLink` y valida las URLs externas contra una allowlist de esquemas (`https:`); evita enlazar URLs recibidas sin validar, porque `javascript:` y `data:` ejecutan código o suplantan contenido.
```ts
// Incorrecto
readonly link = computed(() => this.item().url);
// Correcto
readonly link = computed(() => (isSafeHttpsUrl(this.item().url) ? this.item().url : null));
```
Aplica también a `imageUrl` y a cualquier URL de la API que vaya a `[ngSrc]`/`[src]`: `NgOptimizedImage` escribe el atributo sin pasar por el sanitizador de URL de Angular, así que el esquema se valida a mano (`new URL(v).protocol === 'https:'`) y, si no pasa, no se renderiza la imagen. Añade `referrerpolicy="no-referrer"` a imágenes de terceros.
**Origen:** línea base, 2026-11-05. Refinada: catalog-web, 2026-11-05.

### SR-003 · A01:2025 Broken Access Control · Guards
**Regla:** usa guards solo para la UX (ocultar o redirigir); toda autorización real la valida el backend en cada endpoint, porque cualquier usuario puede saltarse el código del cliente. No envíes ids de otros usuarios desde parámetros de ruta o de UI esperando que el cliente "filtre".
```ts
// Incorrecto: el cliente decide de quién es el carrito
http.get(`/api/users/${route.params.userId}/cart`);
// Correcto: el servidor deduce el usuario de la sesión
http.get('/api/cart');
```
**Origen:** línea base, 2026-11-05.

### SR-004 · A04:2025 Cryptographic Failures · Tokens y secretos
**Regla:** no guardes tokens de sesión ni secretos en `localStorage`, `sessionStorage`, `environment.ts` ni en el bundle; prefiere cookies `HttpOnly; Secure; SameSite` gestionadas por el backend, porque todo lo que está en el cliente es legible por cualquier XSS o por quien inspeccione el bundle.
```ts
// Incorrecto
localStorage.setItem('token', res.token);
export const environment = { apiKey: 'sk_live_…' };
// Correcto
// el backend emite Set-Cookie HttpOnly; el cliente no toca el token
```
Nota del repo: `X-User-Id` es una simulación de sesión **sin seguridad** (supuesto de la prueba técnica); no es autenticación y no debe presentarse como tal.
**Origen:** línea base, 2026-11-05.

### SR-005 · A01:2025 Broken Access Control · Open redirect
**Regla:** al redirigir con un parámetro (`returnUrl`, `next`), acepta solo rutas internas relativas que empiecen con `/` y no con `//` ni `/\`; si no, redirige a `/`, porque un atacante puede usar tu dominio para mandar a la víctima a un sitio malicioso.
```ts
// Correcto
const safe = /^\/(?![/\\])/.test(returnUrl) ? returnUrl : '/';
await router.navigateByUrl(safe);
```
**Origen:** línea base, 2026-11-05.

### SR-006 · A02:2025 Security Misconfiguration · Headers a terceros
**Regla:** los interceptores agregan headers de identidad (`Authorization`, `X-User-Id`) solo a peticiones dirigidas a la API propia (`API_BASE_URL`); evita aplicarlos a cualquier URL, porque se filtrarían a terceros (CDNs, analytics). Lo mismo con `withCredentials`.
```ts
// Correcto
if (!req.url.startsWith(API_BASE_URL)) return next(req);
```
**Origen:** línea base, 2026-11-05 (`core/session/user-id.interceptor.ts`).

### SR-007 · A09:2025 Security Logging and Alerting Failures · Logs
**Regla:** no registres en consola ni envíes a telemetría tokens, headers de identidad, cuerpos completos de peticiones ni datos personales; muestra al usuario mensajes genéricos y loguea solo `code` y `status`, porque los logs del navegador y de terceros son de baja confianza. Lo mismo al revés: no muestres `ApiError.message` del servidor; usa texto propio según el estado. Para saber si un mensaje nació en el cliente usa `status === 0`, no `code`: el `code` también lo escribe el servidor (SEC-catalog-web-01).
```ts
// Incorrecto
console.error('Request failed', req.headers, req.body);
// Correcto
console.error('Request failed', { code: error.code, status: error.status });
// Incorrecto: el code lo puede enviar el servidor
if (error.code === 'NETWORK_ERROR') return error.message;
// Correcto
if (error.status === 0) return error.message;
```
**Origen:** línea base, 2026-11-05. Refinada: catalog-web, 2026-11-05 (SEC-catalog-web-01).

### SR-008 · A03:2025 Software Supply Chain Failures · Dependencias
**Regla:** antes de agregar una dependencia, justifica por qué Angular o el código existente no la resuelven, revisa su mantenimiento y ejecuta `npm audit --omit=dev`; fija versiones con el lockfile y nunca cargues scripts de CDNs sin SRI, porque cada dependencia amplía la superficie de ataque.
**Origen:** línea base, 2026-11-05.

### SR-009 · A10:2025 Mishandling of Exceptional Conditions · Errores
**Regla:** todo flujo asíncrono maneja el error explícitamente (estado `error` en `LoadState`, rollback en mutaciones optimistas) y nunca deja la UI en un estado inconsistente o "cargando" indefinido; evita los `catch` vacíos, porque ocultan fallos y dejan datos desalineados con el servidor.
```ts
// Incorrecto
this.api.add(id).subscribe({ error: () => {} });
// Correcto
this.api.add(id).subscribe({ next: (cart) => this.reconcile(cart), error: (e: ApiError) => this.rollback(snapshot, e) });
```
**Origen:** línea base, 2026-11-05.

### SR-010 · A05:2025 Injection · Parámetros de la URL hacia la API
**Regla:** valida y normaliza los query params de la URL (tipo, rango, longitud, lista de valores permitidos, patrón del slug) en una función pura antes de usarlos y de enviarlos a la API, y envíalos con `HttpParams` (que codifica los valores); evita interpolarlos en la URL con plantillas y evita pasar `string` crudos de `withComponentInputBinding()`, porque cualquiera puede fabricar un enlace con valores arbitrarios y provocar errores, peticiones inválidas o inyección de parámetros (`q=a&sort=x`).
```ts
// Incorrecto
this.http.get(`/api/products?q=${q}&page=${page}`);
// Correcto
const query = parseCatalogQuery({ q, page }); // page 1..1000000, q recortado a 80
this.http.get('/api/products', { params: new HttpParams().set('q', query.q ?? '').set('page', query.page) });
```
**Origen:** catalog-web, 2026-11-05 (`features/catalog/data-access/catalog-query.ts`).
