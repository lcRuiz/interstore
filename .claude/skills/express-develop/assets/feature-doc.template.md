# <Nombre de la feature> (API)

> Estado: implementada · Rama: `<type>/<issue>-<desc>` · PR: #<n> · Última actualización: AAAA-MM-DD

## Propósito
Qué resuelve, en 2–3 líneas. Requerimientos cubiertos: R1, R2… (matriz en el PR).

## Endpoints
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/<recurso>` | `X-User-Id` | Lista paginada |

### `GET /api/<recurso>`
- Query: `page` (≥1, default 1), `pageSize` (1–50, default 12), `category`, `q`, `sort` (`name`\|`price`).
- 200: `{ data: Item[], meta: { page, pageSize, total, totalPages } }`
- Errores: `400 VALIDATION_ERROR`, `401 MISSING_USER`.

## Modelo de datos
| Tabla | Columna | Tipo | Restricciones |
|---|---|---|---|
| … | … | INTEGER | NOT NULL, CHECK (… >= 0) |

Índices: `idx_…` (justificación: consulta X).

## Migraciones
| Migración | Cambio | Reversible | Rollback |
|---|---|---|---|
| 000N_<nombre> | … | sí (down) / no | backup previo + … |

## Errores
| Code | Status | Cuándo |
|---|---|---|

## Decisiones de diseño
| Decisión | Alternativas | Por qué |
|---|---|---|

## Seguridad
Resumen de `docs/security/<feature>-audit.md` (veredicto y reglas SRB aplicadas).

## Limitaciones
- Concurrencia de SQLite: …
- RECORTE: …

## Supuestos
- SUPUESTO: …

## Cómo probar y ejecutar
```bash
cd backend && npm test
npm run dev
curl -H "X-User-Id: 1" "http://localhost:3000/api/<recurso>?page=1"
```
