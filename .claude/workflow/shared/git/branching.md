# Ramas

## Nombre
`<type>/<issue>-<descripcion-corta>`: el tipo de Conventional Commits, el número de issue (si existe) y 2–5 palabras en kebab-case.
| Caso | Rama |
|---|---|
| Feature con issue | `feat/12-cart-optimistic` |
| Bug sin issue | `fix/catalog-empty-page` |
| Ajustes de seguridad | `fix/23-sanitize-product-description` |
| Migración | `refactor/migrate-signal-inputs` |

## Reglas
- Rama base: la del estado (`main` por defecto). Créala desde la base actualizada: `git switch main && git pull --ff-only && git switch -c <rama>` (el `pull` requiere remoto; sin remoto, parte de la `main` local).
- Ramas protegidas (`main`, `master`, `develop`, `release/*`): nunca commit ni push directo.
- Una feature, una rama, un PR. Si aparece trabajo ajeno, va en otra rama.
- Actualizar con la base: `git rebase <base>` solo mientras la rama **no** se haya publicado; si ya está publicada, `git merge <base>` (evita reescribir el historial compartido). Si el entorno ofrece una herramienta de sincronización con la base, úsala.
- Borrar ramas (local o remota) es una acción destructiva: requiere confirmación.

## Antes de crear la rama
```bash
git status --short     # árbol limpio o solo cambios de la feature
git branch --show-current
git remote -v
```
