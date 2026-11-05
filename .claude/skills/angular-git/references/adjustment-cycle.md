# Ciclo de ajustes tras la revisión

## Decidir el camino de cada comentario aceptado
| Tipo de ajuste | Ruta |
|---|---|
| Cambia o agrega comportamiento (bug, caso borde, requerimiento sin cubrir) | `angular-test` (test en rojo) → `angular-develop` → `angular-sec` (delta) → commit |
| Refactor sin efecto funcional | `angular-develop` (tests en verde antes y después) → `angular-sec` si toca sinks o flujos de datos → commit |
| Solo documentación | Edición directa → commit `docs` |
| Test mejorable sin cambio de comportamiento | `angular-test` → verde con el código actual → commit `test` |
| Seguridad | Bucle de remediación de `angular-sec` |

## Commits de ajuste
- Siempre **nuevos**, encima de la rama publicada: `fix(<scope>): …`, `refactor(<scope>): …`, `test(<scope>): …`, `docs(<scope>): …`.
- `fixup! <subject original>` solo si el repo hace `rebase --autosquash` **antes** del merge y el usuario lo aprueba. Nunca hagas autosquash ni `push --force` sobre una rama publicada por iniciativa propia.
- El mensaje cita el comentario: `Addresses review comment on cart-store rollback (docs/reviews/cart-pr-14.md #B1).`

## Registro
En `docs/reviews/<feature>-pr-<n>.md`, sección "Ronda N":
| ID | Nivel | Decisión (aceptado/rechazado) | Justificación | Commit | Estado |
|---|---|---|---|---|---|

Y en `state.md`: iteración de la fase 4 (n/3).

## Re-revisión
- Revisa **solo el delta** desde la ronda anterior: `git diff <sha-ronda-anterior>..HEAD`.
- Confirma que cada bloqueante se cerró con evidencia (test + commit).
- Publica un comentario de seguimiento en el PR con el resumen de la ronda.

## Límite
3 iteraciones. Si siguen abiertos bloqueantes: detente, documenta en el estado (qué se intentó, por qué no se resolvió, opciones) y escala al usuario.
