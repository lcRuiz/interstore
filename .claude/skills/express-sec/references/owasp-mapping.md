# OWASP Top 10:2025 → API Express + SQLite

Edición verificada en `top10.owasp.org` el 2026-11-05. Patrones = regex para buscar en las líneas añadidas; las preguntas guían la revisión manual.

## A01:2025 Broken Access Control (incluye SSRF en 2025)
- **Endpoints sin autenticación/autorización**: rutas nuevas montadas sin el middleware de usuario o de rol. Compara con las rutas vecinas.
- **IDOR/BOLA**: `findById(req.params.id)` sin `AND user_id = ?`; comprobaciones de propiedad después de leer; rutas anidadas sin verificar al padre.
- **Escalamiento por rol**: `role` aceptado del body; endpoints de admin protegidos solo por ocultarlos.
- **Mass assignment**: `req.body` completo hacia `INSERT/UPDATE`, `Object.assign(entity, req.body)`, esquema sin `strict()`/`pick`.
- **CORS**: `origin: '*'` o reflejado sin lista blanca, sobre todo con `credentials: true`.
- **SSRF / open redirect**: `fetch(req.body.url)`, `res.redirect(req.query.next)` sin lista blanca.
- **Path traversal**: `res.sendFile(path.join(dir, req.params.name))` sin normalizar y verificar el prefijo.
- Patrones: `req\.params\.\w*[iI]d`, `req\.(body|query)\.(userId|user_id|role)`, `Object\.assign\([^)]*req\.`, `\.\.\.req\.(body|query)`, `origin:\s*['"]\*`, `res\.redirect\([^)]*req\.`, `(fetch|axios|got|request)\([^)]*req\.`, `(sendFile|download|createReadStream|readFile)\([^)]*req\.`.

## A02:2025 Security Misconfiguration
- Stack traces, `err.message` o texto de SQLite en respuestas; modo debug en producción.
- `x-powered-by` activo, sin headers de seguridad (si el repo usa helmet: ¿se aplica a las rutas nuevas?).
- `trust proxy` en `true` sin proxy; cookies sin `httpOnly`/`secure`/`sameSite`.
- `express.json()` sin `limit` adecuado en rutas nuevas con bodies grandes.
- El archivo `.sqlite`/`.db` o sus backups dentro de un directorio servido por `express.static`.
- Patrones: `res\.(json|send)\([^)]*(stack|\.message)`, `trust proxy['"],\s*true`, `res\.cookie\(`, `express\.static\(`, `express\.json\(\s*\)`.

## A03:2025 Software Supply Chain Failures
- Dependencias nuevas o actualizadas: `npm audit --omit=dev`, mantenimiento, nombre (typosquatting: `expres`, `sqlite-3`), licencia.
- Lockfile no actualizado; dependencias desde git/URL; scripts `postinstall`; `.npmrc` con registros alternativos.
- Patrones: líneas añadidas en `package.json`, `"(pre|post)install"`, `registry=`, `"github:|git\+`.

## A04:2025 Cryptographic Failures
- Contraseñas sin argon2id/bcrypt/scrypt (o con `md5`/`sha1`/`sha256` sin sal ni coste).
- Secretos hardcodeados (JWT, API keys) en código, tests, seed o `.env.example` con valores reales.
- Comparación de tokens/firmas con `===` (no constante): `crypto.timingSafeEqual`.
- Datos sensibles en claro en SQLite (tokens de reset, documentos) y permisos del archivo de la base.
- Patrones: `createHash\(['"](md5|sha1)`, `(secret|api[_-]?key|password)\s*[:=]\s*['"][^'"]{8,}`, `(token|signature|hmac)\w*\s*===`.

## A05:2025 Injection
- **SQL**: template strings o concatenación en SQL; `ORDER BY`/columnas desde la query; `IN (${…})` con valores en lugar de placeholders; `LIKE` sin escapar `%`/`_`; `exec` con varias sentencias y datos.
- **Comandos**: `child_process.exec`/`execSync` con strings; `shell: true`.
- **Prototype pollution**: merge profundo o `Object.assign` con entrada; claves `__proto__`/`constructor`.
- **ReDoS**: `new RegExp(req.…)` o regex con cuantificadores anidados sobre entrada sin límite de longitud.
- **Inyección en logs**: entrada concatenada con saltos de línea.
- Patrones: `` `[^`]*\b(SELECT|INSERT|UPDATE|DELETE|WHERE|ORDER BY)\b[^`]*\$\{ ``, `(SELECT|INSERT|UPDATE|DELETE)[^;]*['"]\s*\+`, `from ['"](node:)?child_process`, `new RegExp\([^)]*req\.`, `__proto__`.

## A06:2025 Insecure Design
- Sin límite de `pageSize`, de longitud de strings o de tamaño de body; sin rate limiting en login, registro o escritura.
- Reglas de negocio abusables: puntos o precios calculados con datos del cliente; acciones repetibles sin idempotencia (checkout doble, puntos por agregar/quitar en bucle).
- Chequeos fuera de la transacción (TOCTOU de stock o saldo).
- Preguntas: ¿qué pasa si el cliente repite la petición 1000 veces? ¿Y si envía valores negativos o enormes?

## A07:2025 Authentication Failures
- Fuerza bruta sin límite; enumeración por mensajes o tiempos distintos; tokens sin expiración o sin revocación; JWT con `alg: none` o algoritmos no fijados; refresh tokens reutilizables; logout que no invalida.
- Ver `auth-jwt-sessions.md`.
- Patrones: `jwt\.decode\(`, `algorithms?\s*:\s*\[?['"]none`, `expiresIn`, `login|signin|password`.

## A08:2025 Software or Data Integrity Failures
- Deserialización insegura (`node-serialize`, `eval`, `JSON.parse` de datos firmados sin verificar la firma).
- Migraciones que desactivan `foreign_keys` sin `foreign_key_check` final, `DROP`/`DELETE` sin plan de rollback, migraciones ya aplicadas que se editan.
- CI que se salta tests o auditoría.
- Patrones: `foreign_keys\s*=\s*OFF`, `DROP TABLE`, `DELETE FROM \w+\s*[;'"`]`, `--no-verify`.

## A09:2025 Security Logging and Alerting Failures
- Contraseñas, tokens, `Authorization`, cookies o PII en logs; bodies completos registrados.
- Eventos de seguridad sin registrar (login fallido, 403 repetidos, cambios de rol).
- Patrones: `(log|info|debug|warn|error)\([^)]*req\.(body|headers)`, `console\.log\(`.

## A10:2025 Mishandling of Exceptional Conditions
- `catch` vacíos; errores que dejan transacciones abiertas o datos a medias; "fallar abierto" (si falla la verificación de permisos, se permite).
- Rechazos no manejados en Express 4; respuestas 200 ante errores parciales.
- Patrones: `catch\s*(\([^)]*\))?\s*\{\s*\}`, `\.catch\(\(\)\s*=>\s*(undefined|null|\{\s*\})\)`.

---
## Señales específicas de este repo
- `X-User-Id` es una sesión simulada: cualquier hallazgo que dependa de suplantarlo es **informativo** (riesgo aceptado del supuesto), salvo que una feature nueva lo use para algo sensible (pagos, admin): entonces es alto.
- Reglas de negocio de puntos: el ledger con `UNIQUE(user_id, action, ref_id)` es la defensa de idempotencia; una feature que otorgue puntos sin pasar por él es A06.
