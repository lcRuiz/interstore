# Manejo de errores

## Formato único
Usa el formato que ya tenga el repo. Si no hay ninguno, propón **RFC 9457 Problem Details** (`application/problem+json`: `type`, `title`, `status`, `detail`, `instance`, más extensiones como `code` y `errors`) y regístralo como decisión. En este repo el formato vigente es:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos de entrada inválidos", "details": [] } }
```
No mezcles formatos: el cliente depende de una sola forma.

## Errores tipados
```ts
export class AppError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) {
    super(message);
  }
  static notFound(code: string, message: string) { return new AppError(404, code, message); }
  static conflict(code: string, message: string, details?: unknown) { return new AppError(409, code, message, details); }
}
```
- `code`: estable, en `SCREAMING_SNAKE_CASE`, con significado de negocio (`OUT_OF_STOCK`, `ORDER_NOT_FOUND`). Es parte del contrato: documéntalo en OpenAPI.
- `message`: para humanos; sin datos internos.
- `details`: solo información útil y segura (campos inválidos), nunca SQL, rutas de archivo ni stack.

## Middleware central (al final de `createApp`)
1. `AppError` → su status y cuerpo.
2. Errores del parser de JSON (`type === 'entity.parse.failed'` → 400 `INVALID_JSON`; `entity.too.large` → 413).
3. Errores de validación no capturados → 400.
4. Errores de SQLite que escaparon del servicio → 500 genérico (y un log con el detalle).
5. Todo lo demás → 500 `INTERNAL_ERROR` con un mensaje genérico; el detalle va **solo al log**, con un id de correlación.

## Traducción de errores de datos
El servicio traduce los errores del driver a errores de dominio:
| Error SQLite | Error de dominio típico |
|---|---|
| `UNIQUE constraint failed: products.name` | `409 PRODUCT_NAME_TAKEN` |
| `FOREIGN KEY constraint failed` | `404 PRODUCT_NOT_FOUND` o `409` según el caso |
| `CHECK constraint failed` | Indica una validación faltante en el borde: agrégala; el `CHECK` es la última defensa |
| `SQLITE_BUSY` | `503 SERVICE_BUSY` + `Retry-After`, o reintento acotado |

Detecta el tipo por el código del error del driver (`err.code`, `errcode`, según el driver; verifícalo en su doc), no solo por el texto.

## Express 4
Sin `asyncHandler`, un `throw` dentro de un handler `async` no llega al middleware de error: la petición queda colgada o el proceso registra un rechazo no manejado.

## Fallos del proceso
`process.on('unhandledRejection')` y `uncaughtException`: registra y termina de forma controlada (el supervisor reinicia). No sigas sirviendo con un estado desconocido.
