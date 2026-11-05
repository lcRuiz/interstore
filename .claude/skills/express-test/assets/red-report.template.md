# Reporte RED: <feature>

Fecha: AAAA-MM-DD · Iteración: N/3 · Runner: Vitest · Express 5 · node:sqlite

## Comandos (salida real)
```bash
cd backend
npm run typecheck   # debe pasar: los esqueletos tienen las firmas finales
npm test
```

## Resumen
| Typecheck | Total | Fallidos | Pasados | Nuevos | Previos en verde |
|---|---|---|---|---|---|
| ✅ | 0 | 0 | 0 | 0 | 0/0 |

## Fallos
| # | Spec › test | Error (primera línea) | Clasificación | Req. |
|---|---|---|---|---|
| 1 | products.routes.test.ts › debe responder 201 … | `expected 501 to be 201` | ✅ esperado (esqueleto 501) | C1 |
| 2 | orders.repository.test.ts › debe revertir … | `Error: Not implemented` | ✅ esperado | D2 |

## Inválidos corregidos en esta fase
| Test | Problema | Corrección |
|---|---|---|

## Excepciones (legado: caracterización en verde)
| Test | Comportamiento fijado | Nota |
|---|---|---|

## Esqueletos, migraciones y fixtures creados
- Ruta `POST /api/…` → 501 `NOT_IMPLEMENTED`
- `XService.create()` → `throw new Error('Not implemented')`
- Migración `000N_<nombre>` (tabla mínima)
- `tests/factories.ts`: `makeX`, `insertX`

## Veredicto
- [ ] Typecheck en verde
- [ ] Todos los fallos ✅ esperados
- [ ] Previos en verde
- [ ] Cada requerimiento con ≥ 1 test

**Listo para express-develop: SÍ / NO**
