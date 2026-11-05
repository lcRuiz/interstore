# Pruebas del manejo de errores

## Formato uniforme
Todas las respuestas de error usan **un solo formato**: el del repo (p. ej. `{ error: { code, message, details? } }`) o RFC 9457 (`application/problem+json` con `type`, `title`, `status`, `detail`). Un test por clase de error:

| Clase | Cómo provocarla | Afirmar |
|---|---|---|
| Ruta inexistente | `GET /api/nope` | 404 + `ROUTE_NOT_FOUND` |
| JSON malformado | body `'{"a":'` | 400 + `INVALID_JSON` |
| Validación | body/query/params inválidos | 400 + `VALIDATION_ERROR` + `details` con ubicación y campo |
| Dominio | regla de negocio violada | 409/422 + código de negocio |
| Payload grande | body > límite | 413 |
| Inesperado | doble que lanza `new Error('boom')` | 500 + `INTERNAL_ERROR`, **sin** `stack`, sin texto de SQL, sin el mensaje interno |

## Fugas de información
```ts
it('no debe exponer detalles internos cuando un repositorio lanza un error de SQLite', async () => {
  const { app } = createTestApp({ productsRepo: failingRepo(new Error('SQLITE_ERROR: no such column: pricee')) });
  const res = await request(app).get('/api/products');
  expect(res.status).toBe(500);
  expect(JSON.stringify(res.body)).not.toMatch(/SQLITE|no such column|at .*\.ts/);
});
```

## Validación detallada
- Reporta **todos** los problemas, no solo el primero (si el repo lo hace), con su ubicación (`body`, `query`, `params`).
- Tipos coercionados de query (`page=abc` → 400).
- Strings vacíos vs ausentes, números negativos, enteros fuera de rango, enums inválidos.

## Errores de base de datos traducidos
- `UNIQUE constraint failed` → 409 con un código de negocio, no 500.
- `FOREIGN KEY constraint failed` → 400/404/409 según el caso, decidido en el servicio.
- `SQLITE_BUSY` (si aplica) → 503 con `Retry-After`, o reintento interno documentado.

## Logging en errores
Si hay logger inyectable, espíalo y afirma que un 500 se registra **con** un id de correlación y **sin** datos sensibles (body completo, `Authorization`, contraseñas).
