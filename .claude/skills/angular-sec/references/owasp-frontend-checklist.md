# Checklist OWASP Top 10:2025 para frontend Angular

Edición verificada en `top10.owasp.org` el 2026-11-05. Si la edición vigente cambia, actualiza los IDs y la fecha.

Cada categoría indica qué revisar **en el diff** de un frontend Angular, con patrones de búsqueda (regex para Grep sobre líneas añadidas) y preguntas de revisión manual. Algunas categorías dependen sobre todo del backend: se revisa lo que el frontend puede empeorar o exponer.

## Tabla de contenidos
A01 Broken Access Control · A02 Security Misconfiguration · A03 Software Supply Chain Failures · A04 Cryptographic Failures · A05 Injection · A06 Insecure Design · A07 Authentication Failures · A08 Software or Data Integrity Failures · A09 Security Logging and Alerting Failures · A10 Mishandling of Exceptional Conditions

---

## A01:2025 Broken Access Control
En la edición 2025, SSRF quedó dentro de esta categoría (verifícalo en la página de A01).
- **Guards como única barrera**: rutas o acciones "protegidas" solo por `canActivate` o por ocultar botones. Pregunta: ¿el endpoint valida el permiso en el servidor?
- **IDOR**: ids de recursos tomados de la ruta, query params o almacenamiento y enviados a la API sin que el servidor derive el dueño de la sesión (`/api/users/:id/...`).
- **Open redirect**: `navigateByUrl`, `window.location`, `location.assign` con `returnUrl`/`next`/`redirect` sin validar.
- **Elevación por estado del cliente**: roles o flags (`isAdmin`) en `localStorage` o en signals editables que habilitan acciones.
- Patrones: `navigateByUrl\(`, `window\.location(\.href)?\s*=`, `location\.assign\(`, `returnUrl|redirectUrl|redirect_uri|next=`, `isAdmin|role\s*[=:]`, `canActivate`.

## A02:2025 Security Misconfiguration
- **CORS / credenciales**: `withCredentials: true` nuevo, o hacia orígenes que no son la API.
- **Headers a terceros**: interceptores que agregan `Authorization`/`X-User-Id` a cualquier URL.
- **CSP**: cambios en `index.html` (`<meta http-equiv="Content-Security-Policy">`), `unsafe-inline` o `unsafe-eval` nuevos.
- **Build**: `sourceMap: true` en producción, `optimization: false` en producción, proxy de desarrollo usado como configuración de producción.
- **Enlaces**: `target="_blank"` hacia sitios externos sin `rel="noopener noreferrer"` (los navegadores modernos aplican `noopener` por defecto: informativo).
- Patrones: `withCredentials`, `setHeaders`, `Content-Security-Policy`, `unsafe-inline|unsafe-eval`, `"sourceMap":\s*true`, `target="_blank"`.

## A03:2025 Software Supply Chain Failures
- Dependencias nuevas o actualizadas en `package.json` / lockfile: ¿son necesarias?, ¿están mantenidas?, ¿qué dice `npm audit --omit=dev`?
- Scripts o estilos cargados desde CDNs en `index.html` sin `integrity` (SRI).
- Scripts `postinstall` nuevos, registros npm alternativos (`.npmrc`), dependencias desde git o URLs.
- Patrones: líneas añadidas en `package.json` dentro de `dependencies`/`devDependencies`, `<script src="http`, `integrity=`, `postinstall`, `registry=`.

## A04:2025 Cryptographic Failures
- **Secretos en el bundle**: claves, tokens o passwords en `environment*.ts`, constantes o archivos JSON de `public/`.
- **Tokens en el navegador**: `localStorage`/`sessionStorage` con token, jwt, auth o session.
- **Transporte**: URLs `http://` hacia hosts que no son locales.
- **"Cifrado" en el cliente** como medida de seguridad (base64, XOR o cifrado con una clave embebida).
- Patrones: `(api[_-]?key|secret|password|passwd|token|bearer)\s*[:=]\s*['"][^'"]{6,}`, `(local|session)Storage\.setItem\(`, `http://(?!localhost|127\.0\.0\.1)`, `atob\(|btoa\(`.

## A05:2025 Injection
En el frontend, esta categoría es principalmente **XSS**:
- `bypassSecurityTrustHtml/Script/Style/Url/ResourceUrl`: **siempre** se revisa manualmente.
- `[innerHTML]`, `[outerHTML]`, `innerHTML =`, `insertAdjacentHTML`, `document.write`, `Renderer2.setProperty(el, 'innerHTML', …)`.
- `ElementRef.nativeElement` manipulado con datos externos.
- `[href]`/`[src]`/`[attr.href]` con valores dinámicos (esquemas `javascript:` y `data:`).
- `eval`, `new Function`, `setTimeout('string')`.
- Templates construidos dinámicamente (compilar componentes en runtime a partir de strings).
- Patrones: `bypassSecurityTrust`, `innerHTML|outerHTML|insertAdjacentHTML|document\.write`, `\[(attr\.)?(href|src)\]`, `javascript:`, `\beval\(|new Function\(`, `nativeElement`.

## A06:2025 Insecure Design
- Reglas de negocio decididas en el cliente: precios, descuentos, **puntos** o límites calculados por el frontend y enviados a la API como valor confiable.
- Flujos sin protección contra repetición (doble envío de una compra sin idempotencia ni deshabilitar el control).
- Confianza en validaciones solo de cliente.
- Preguntas: ¿qué pasa si el usuario edita la petición en DevTools? ¿El servidor recalcula?

## A07:2025 Authentication Failures
- Manejo de tokens: refresh en bucle, tokens que no se invalidan al hacer logout, sesión persistida más allá de lo necesario.
- Logout que no limpia el estado de los stores (datos del usuario anterior visibles).
- Mensajes que permiten enumerar usuarios ("este email no existe").
- Cambio de usuario o sesión simulada (como `X-User-Id` en este repo) presentada como autenticación real.
- Patrones: `logout|signOut`, `refresh[_-]?token`, `X-User-Id|Authorization`.

## A08:2025 Software or Data Integrity Failures
- Deserializar datos no confiables sin validar (`JSON.parse` de storage o de la URL, usado como estado confiable).
- Cargar configuración o feature flags desde fuentes no confiables.
- Cambios en pipelines de CI que se saltan tests, lint o auditoría.
- Patrones: `JSON\.parse\(`, `.github/workflows/`, `--no-verify`.

## A09:2025 Security Logging and Alerting Failures
- `console.log/debug/info` con headers, bodies, tokens o datos personales.
- Errores del servidor mostrados tal cual al usuario (stack traces, SQL).
- Telemetría nueva que envía datos personales.
- Patrones: `console\.(log|debug|info|trace)\(`, `error\.(stack|error)\b` en templates.

## A10:2025 Mishandling of Exceptional Conditions
- `catch` vacíos, `subscribe({ error: () => {} })`, promesas sin manejo.
- Estados de UI que quedan en "cargando" para siempre ante un error; mutaciones optimistas sin rollback.
- Fallos abiertos: si la verificación de un permiso o feature flag falla, ¿se permite la acción?
- Patrones: `catch\s*(\([^)]*\))?\s*\{\s*\}`, `error:\s*\(\)\s*=>\s*\{\s*\}`, `\.catch\(\(\)\s*=>\s*(undefined|null|\{\s*\})\)`.

---

## Señales específicas de este repo
- `X-User-Id` es una sesión simulada (supuesto de la prueba): cualquier feature que lo use para autorizar es **riesgo del backend** a reportar, no a "arreglar" en el cliente.
- El servidor es la fuente de verdad de precios, stock y puntos: un frontend que envía puntos o totales calculados es A06.
