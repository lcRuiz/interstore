# Matriz requerimiento → pruebas: <feature>

Fecha: AAAA-MM-DD · Fuente del requerimiento: <issue / mensaje / doc>

## Requerimientos y reglas
| ID | Tipo | Descripción | Origen |
|---|---|---|---|
| R1 | Funcional | … | requerimiento |
| RN1 | Regla de negocio | … | backend / doc |
| C1 | Contrato | `GET /api/…` → `{ data, meta }` | backend/src/… |
| UI1 | Estado de UI | Vacío: "…" | diseño / CLAUDE.md §8 |

## Matriz
| Req. | Caso de prueba (debe … cuando …) | Capa | Spec | Estado |
|---|---|---|---|---|
| R1 | debe … cuando … | store | features/x/data-access/x-store.spec.ts | RED |
| R1 | debe … cuando … | page | features/x/pages/x-page/x-page.spec.ts | RED |
| C1 | debe enviar page y category cuando … | api | features/x/data-access/x-api.spec.ts | RED |
| UI1 | debe mostrar el estado vacío cuando … | page | … | RED |

## Casos borde considerados
- …

## Fuera de alcance (y por qué)
- …

## Supuestos
- …
