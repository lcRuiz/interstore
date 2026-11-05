# Matriz requerimiento → pruebas: <feature>

Fecha: AAAA-MM-DD · Fuente: <issue / mensaje / OpenAPI>

## Requerimientos y reglas
| ID | Tipo | Descripción | Origen |
|---|---|---|---|
| R1 | Funcional | … | requerimiento |
| RN1 | Regla de negocio | … | … |
| C1 | Contrato | `POST /api/…` → 201 `{ data }` + `Location` | OpenAPI / acuerdo |
| A1 | Autorización | Solo el dueño puede leer su pedido (404 si no) | requerimiento |
| D1 | Datos | `UNIQUE(user_id, product_id)` | modelo |

## Matriz
| Req. | Caso (debe … cuando …) | Nivel | Spec | Estado |
|---|---|---|---|---|
| R1 | debe … cuando … | unit | tests/x.service.test.ts | RED |
| C1 | debe responder 201 con Location cuando … | http | tests/x.routes.test.ts | RED |
| A1 | debe responder 404 cuando el pedido es de otro usuario | http | tests/x.routes.test.ts | RED |
| D1 | debe lanzar UNIQUE cuando … | repo | tests/x.repository.test.ts | RED |

## Cobertura de casos obligatorios por endpoint
| Endpoint | Feliz | 400 | 401 | 403/IDOR | 404 | 409 | Extra | Paginación | Límites | 500 |
|---|---|---|---|---|---|---|---|---|---|---|
| `GET /api/…` | ✅ | ✅ | ✅ | n/a | n/a | n/a | n/a | ✅ | ✅ | ✅ |

## Migraciones a probar
- 000N_<nombre>: desde cero ✅ · idempotencia ✅ · datos existentes (si transforma) …

## Fuera de alcance (y por qué)
- …

## Supuestos
- …
