## Contexto
<Problema y requerimiento original. Closes #N>

## Cambios
- <cambio 1>

Estrategia de commits: <migración separada → test → feat → docs | otra, porque …>

## Endpoints afectados
| Método | Ruta | Cambio | ¿Compatible? |
|---|---|---|---|
| POST | `/api/orders` | nuevo | sí |

Contrato: [`openapi.yaml`](backend/openapi.yaml) actualizado.

## Migraciones y plan de rollback
| Migración | Cambio | Reversible | Rollback |
|---|---|---|---|
| 000N_<nombre> | crea `…` | sí (down probado) / no | revertir commit `<sha>` + down / restaurar backup |

- Backup previo recomendado: `<comando>` (con el servidor detenido).
- Compatibilidad con la versión anterior del código: sí/no (motivo).
- Impacto en bloqueo de escrituras: despreciable / <estimación>.

## Matriz requerimiento → test
| Req. | Descripción | Tests | Estado |
|---|---|---|---|

## Resultados
| Verificación | Resultado |
|---|---|
| Tests (`npm test`) | X/X |
| Cobertura (si aplica) | líneas X % · ramas X % |
| Typecheck / lint / build | ✅ / ✅ / ✅ |
| Migraciones desde cero (`:memory:`) | ✅ |

## Seguridad
- Veredicto: **APROBADO** (OWASP Top 10:2025)
- Hallazgos: <resueltos / aceptados / falsos positivos>
- Informe: [`docs/security/<feature>-audit.md`](docs/security/<feature>-audit.md)
- Reglas nuevas o refinadas: SRB-…

## Riesgos, supuestos y limitaciones
- SUPUESTO: …
- Limitación: concurrencia de SQLite (un escritor) …

## Checklist
- [ ] Casos obligatorios por endpoint cubiertos y en verde
- [ ] Ningún test relajado sin justificación
- [ ] SQL parametrizado; filtro por dueño; DTO explícito
- [ ] Migración versionada con plan de rollback
- [ ] OpenAPI y doc de la feature actualizados
- [ ] Auditoría sin críticos/altos abiertos
- [ ] Conventional Commits
