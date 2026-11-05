# Checklist de seguridad Express (aplicar a lo que cambió)

## Rutas nuevas o modificadas
- [ ] ¿Requieren usuario? ¿El middleware de autenticación está montado en **esa** ruta (no solo en las vecinas)?
- [ ] ¿Requieren rol? Middleware declarativo, no un `if` disperso.
- [ ] ¿Acceden a recursos por id? Filtro por dueño en la consulta (IDOR).
- [ ] `params`, `query` y `body` validados con esquema antes de usarse; tipos coercionados con límites.
- [ ] Bodies de escritura mapeados a un DTO explícito (sin mass assignment).
- [ ] Respuestas mapeadas a DTO (sin columnas internas: `password_hash`, flags internos).
- [ ] Paginación con máximo; búsquedas con longitud máxima.

## Middlewares y configuración
- [ ] `x-powered-by` desactivado; headers de seguridad si el repo los usa.
- [ ] CORS con orígenes explícitos; nunca `*` con `credentials: true`.
- [ ] `express.json({ limit })` acorde; `express.urlencoded` solo si hace falta.
- [ ] `trust proxy` explícito por entorno.
- [ ] Rate limiting en login, registro, recuperación de contraseña y escrituras costosas.
- [ ] Cookies (si hay): `httpOnly`, `secure` (en HTTPS), `sameSite`, expiración.
- [ ] `express.static` no sirve el directorio de datos ni backups.

## Errores
- [ ] El error handler central atiende las rutas nuevas (Express 4: `asyncHandler`).
- [ ] Sin `stack`, `err.message` interno, SQL ni rutas de archivos en las respuestas.
- [ ] Errores de SQLite traducidos a errores de dominio (no 500 por un `UNIQUE`).
- [ ] Mismo formato de error que el resto de la API.

## Config y secretos
- [ ] Variables nuevas en el esquema de config y en `.env.example` (con valores ficticios).
- [ ] Sin secretos en código, tests, seed, OpenAPI ni ejemplos de la doc.

## Salidas hacia afuera
- [ ] Peticiones salientes con URL derivada del usuario: lista blanca de hosts y esquemas; sin seguir redirecciones a destinos no permitidos (SSRF).
- [ ] `res.redirect` solo a rutas internas o a una lista blanca.
- [ ] Archivos: nombres generados por el servidor; rutas resueltas y verificadas dentro del directorio permitido.
- [ ] `child_process`: `execFile` con argumentos en array, sin shell, sin entrada del usuario si es posible.

## Logs
- [ ] Campos estructurados, id de correlación, redacción de datos sensibles.
- [ ] Eventos de seguridad registrados (401/403 repetidos, login fallido).
