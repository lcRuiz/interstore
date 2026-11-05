# Diseño de API REST

## Recursos y rutas
- Sustantivos en plural, minúscula, kebab-case: `/api/products`, `/api/orders/:orderId/items`.
- Recursos del usuario actual sin id en la ruta: `/api/me`, `/api/cart` (el servidor deduce el usuario: elimina una clase entera de IDOR).
- Acciones que no encajan en CRUD como subrecurso o POST explícito: `POST /api/orders` (checkout), `POST /api/cart/items`.

## Métodos y códigos
| Operación | Método | Éxito | Errores típicos |
|---|---|---|---|
| Listar | GET | 200 `{ data, meta }` | 400 (query inválida) |
| Obtener | GET | 200 `{ data }` | 404 |
| Crear | POST | 201 `{ data }` + `Location` | 400, 409 |
| Reemplazar / actualizar parcial | PUT / PATCH | 200 `{ data }` | 400, 404, 409 |
| Borrar | DELETE | 204 | 404 |
| Sin autenticar / sin permiso | — | — | 401 / 403 (o 404 para no revelar existencia) |
| Payload grande / demasiadas peticiones | — | — | 413 / 429 (`Retry-After`) |
| No implementado (esqueleto) | — | — | 501 |

400 vs 422: usa el que ya use el repo (este repo: 400 `VALIDATION_ERROR`).

## Paginación, filtros y orden
- Query: `page` (≥ 1, default 1), `pageSize` (default 12–20, **máximo** 50–100), filtros explícitos (`category`, `q`), `sort` desde una lista blanca.
- Respuesta: `{ data: T[], meta: { page, pageSize, total, totalPages } }`.
- Orden estable: siempre desempata por `id`.
- Página fuera de rango: `data: []` con `meta` coherente (no 404).
- Offset es suficiente para catálogos pequeños; cursor (`?after=<id>`) para colecciones grandes o que cambian mucho. Documenta la decisión.

## Idempotencia
- GET, PUT y DELETE son idempotentes por definición: diséñalos así (DELETE de algo ya borrado → 404 o 204, decláralo).
- Operaciones críticas no idempotentes (checkout, pagos, otorgar puntos): clave de idempotencia (`Idempotency-Key`) o una restricción natural (`UNIQUE(user_id, action, ref_id)`) que impida duplicados.

## Contrato y versionado
- El contrato vive en `openapi.yaml` y en los tests; ambos se actualizan juntos.
- Cambios compatibles: agregar campos opcionales, endpoints nuevos.
- Cambios incompatibles (renombrar o quitar campos, cambiar tipos o códigos): nueva versión (`/api/v2`) o una ventana de deprecación; `BREAKING CHANGE` en el commit.
- Nombres de campos en JSON en `camelCase`; columnas en `snake_case`; el repositorio mapea.

## Montos y fechas
- Dinero en enteros (unidades menores o la moneda sin decimales, como COP); nunca `float`.
- Fechas en ISO 8601 UTC.
