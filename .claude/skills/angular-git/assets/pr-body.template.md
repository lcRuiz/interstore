## Contexto
<Problema que resuelve y requerimiento original (enlace al issue: Closes #N).>

## Cambios
- <cambio 1: qué y dónde>
- <cambio 2>

Estrategia de commits: <atómicos TDD (test → feat → docs) | uno solo, porque …>

## Matriz requerimiento → test
| Req. | Descripción | Tests | Estado |
|---|---|---|---|
| R1 | … | `x-store.spec.ts` › debe … | ✅ |

## Resultados
| Verificación | Resultado |
|---|---|
| Tests (`npx ng test --watch=false`) | X/X en verde |
| Cobertura (si aplica) | X % |
| Lint / formato | ✅ / ✅ |
| Build | ✅ |

## Seguridad
- Veredicto: **APROBADO** (OWASP Top 10:2025)
- Hallazgos: <n resueltos, n aceptados, n falsos positivos>
- Informe: [`docs/security/<feature>-audit.md`](docs/security/<feature>-audit.md)
- Reglas nuevas o refinadas: SR-…

## Riesgos y supuestos
- SUPUESTO: …
- Riesgo: …

## Capturas
<si hay cambios visuales: antes/después, móvil y escritorio>

## Checklist
- [ ] Tests de cada requerimiento, en verde
- [ ] Ningún test relajado o eliminado sin justificación
- [ ] Estados de carga/vacío/error/éxito
- [ ] Auditoría de seguridad sin críticos/altos abiertos
- [ ] Documentación de la feature actualizada
- [ ] Conventional Commits
