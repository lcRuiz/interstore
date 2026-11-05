# Patrones de Express

Verifica la versión: `npm ls express`. Guía oficial de migración a 5: `https://expressjs.com/en/guide/migrating-5.html`.

## Express 5 vs 4 (lo que cambia el diseño)
| Tema | Express 5 | Express 4 |
|---|---|---|
| Errores en handlers `async` | Una promesa rechazada llega a `next(err)` automáticamente | Hace falta `asyncHandler(fn)` o `try/catch` + `next(err)` |
| `req.query` | Getter de solo lectura | Mutable |
| Rutas comodín | `/*splat`, parámetros opcionales con llaves `{/:param}` | `*`, `/:param?` |
| `req.body` sin parser | `undefined` | `{}` |

```ts
// Solo Express 4
export const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

## Orden de middlewares en `createApp`
1. `app.disable('x-powered-by')` y `app.set('trust proxy', <valor explícito>)`.
2. Headers de seguridad (`helmet` si el repo lo usa; dependencia nueva = puerta humana).
3. CORS con origen explícito (nunca `*` con credenciales).
4. `express.json({ limit: '100kb' })` (límite acorde al caso de uso).
5. Rate limiting en endpoints sensibles (login, escritura) si aplica.
6. Rutas (`/api/<recurso>`), cada una con su autenticación y validación.
7. 404 (`notFoundHandler`) y **error handler al final**.

## Validación en el borde
Valida `params`, `query` y `body` con un esquema antes del controlador y entrega los datos ya parseados y tipados. En Express 5 no reasignes `req.query`: pasa el resultado como argumento o en `res.locals`.
```ts
router.get('/', withValidation({ query: listQuerySchema }, ({ query }, _req, res) => { /* … */ }));
```
Esquemas:
- `z.object({...}).strict()` en bodies de escritura si el contrato rechaza campos extra (anti mass assignment), o `.pick()`/mapeo explícito al DTO si los ignora. Decide uno y documéntalo.
- `z.coerce.number().int().min(1).max(100)` para la paginación.
- `z.enum([...])` para `sort` y filtros cerrados.

## `trust proxy`
Configúralo explícitamente (`false` en local; el número de saltos o la subred del proxy en despliegue). `true` a ciegas permite falsificar `req.ip` con `X-Forwarded-For`, lo que rompe el rate limiting y los logs.

## Respuestas
- Éxito: el envoltorio del repo (p. ej. `{ data }` / `{ data, meta }`).
- `201 Created` + header `Location` al crear; `204 No Content` al borrar.
- Nunca devuelvas filas crudas de la base: mapéalas a DTOs (evita filtrar columnas internas).

## Apagado ordenado
```ts
const server = app.listen(port);
const shutdown = () => server.close(() => { db.close(); process.exit(0); });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```
