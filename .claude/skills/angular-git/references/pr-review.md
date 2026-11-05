# Revisión del PR

## Mentalidad
Revisa como si el código fuera de otra persona y lo fueras a mantener tú. Busca lo que el autor no pudo ver: requerimientos sin test, casos borde, contratos implícitos, riesgos operativos. Cada comentario dice **qué**, **por qué** y **qué propones**.

## Insumos
```bash
gh pr view <n> --json title,body,files,commits
gh pr diff <n>
```
Más: la matriz (`.workflow/<feature>/test-matrix.md`), el reporte GREEN, el informe de seguridad y `angular-develop/references/pr-checklist.md`.

## Ejes y preguntas
| Eje | Preguntas |
|---|---|
| Correctitud | ¿Cumple cada criterio de aceptación? ¿Casos borde (vacío, error, límites, doble clic)? |
| Pruebas | ¿Cada requerimiento de la matriz tiene un test? ¿Prueban comportamiento o implementación? ¿Algún test se relajó? |
| Seguridad | ¿El informe cubre todo el diff final? ¿Hay sinks nuevos tras la auditoría? ¿Hay reglas `SR-*` incumplidas? |
| Rendimiento | ¿`track` correcto? ¿Hay trabajo en el template? ¿Se respetan los budgets del build? |
| Accesibilidad | ¿Hay roles, labels y foco? ¿`aria-live` en los cambios dinámicos? |
| Legibilidad | ¿Los nombres son claros? ¿Hay abstracciones innecesarias? ¿Se respetan las convenciones del repo? |
| Documentación | ¿El doc de la feature refleja el código final? ¿Hay TSDoc en la API pública? |
| Commits | ¿Siguen la convención? ¿Son atómicos? ¿El mensaje explica el porqué? |

## Clasificación
| Nivel | Significado | Efecto |
|---|---|---|
| **Bloqueante** | Bug, requerimiento sin cubrir, test inválido, riesgo de seguridad, violación de un contrato o de la arquitectura | Impide el merge; dispara el ciclo de ajustes |
| **Sugerencia** | Mejora con beneficio claro (legibilidad, rendimiento, test adicional) | Se acepta (ajuste) o se rechaza con justificación escrita |
| **Nit** | Preferencia menor, formato no cubierto por el linter | Opcional; no reabre el ciclo |

## Formato de comentario
```markdown
**[bloqueante]** `features/cart/data-access/cart-store.ts:58`
El rollback restaura `items`, pero no `total`: tras un 409, la UI muestra un total que no coincide con los ítems.
Propuesta: guardar en el snapshot el estado completo y restaurarlo entero. Agregar un test "debe restaurar el total cuando falla add".
```

## Publicación
- Un solo cuerpo de revisión con todos los comentarios, agrupados por nivel y con `archivo:línea`:
  ```bash
  gh pr review <n> --comment --body-file docs/reviews/<feature>-pr-<n>.md
  ```
- Comentarios en línea (opcional, si aportan contexto): `gh api repos/{owner}/{repo}/pulls/<n>/comments` con `path`, `line`, `side` y `commit_id`.
- En un PR propio, GitHub solo permite `--comment` (no `--approve` ni `--request-changes`); indica el estado ("Cambios requeridos: 2 bloqueantes") en el cuerpo.

## Documento
`docs/reviews/<feature>-pr-<n>.md` (plantilla en `assets/pr-review.template.md`). Se actualiza en cada ronda: no se sobrescriben rondas anteriores, se agregan.
