# Ciclo de ajustes tras la revisión (backend)

## Ruta de cada comentario aceptado
| Tipo de ajuste | Ruta |
|---|---|
| Comportamiento (bug, caso borde, autorización) | `express-test` (rojo) → `express-develop` → `express-sec` (delta) → commit `fix`/`feat` |
| Esquema (columna, índice, constraint) | `express-test` (test de migración o de repositorio en rojo) → **migración nueva** → `express-sec` (delta) → commit `feat(db)`/`fix(db)` |
| Migración ya publicada con un problema | Nunca editarla: migración correctiva nueva; si aún no se aplicó en ningún entorno compartido y el usuario lo aprueba, reemplazarla es una excepción documentada |
| Contrato (OpenAPI) | Tests HTTP → código → OpenAPI → `BREAKING CHANGE` si aplica |
| Refactor sin efecto funcional | `express-develop` con tests en verde antes y después → `express-sec` si toca SQL, auth o flujos de datos → commit `refactor` |
| Solo documentación | Edición directa → commit `docs` |
| Seguridad | Bucle de remediación de `express-sec` |

## Commits de ajuste
- Siempre **nuevos** sobre la rama publicada; citan el comentario: `Addresses review comment B1 (docs/reviews/orders-pr-31.md).`
- `fixup!` solo si el repo hace autosquash antes del merge y el usuario lo aprueba. Nunca `push --force` por iniciativa propia.

## Registro
`docs/reviews/<feature>-pr-<n>.md`, sección "Ronda N":
| ID | Nivel | Decisión | Justificación | Commit | Estado |
|---|---|---|---|---|---|

Y en `state.md`: iteración de la fase 4 (n/3) y migraciones nuevas.

## Re-revisión
- Solo el delta: `git diff <sha-ronda-anterior>..HEAD`.
- Cada bloqueante se cierra con evidencia (test + commit).
- Comentario de seguimiento en el PR con el resumen de la ronda.

## Límite
3 iteraciones; después detente, documenta el bloqueo y escala.
