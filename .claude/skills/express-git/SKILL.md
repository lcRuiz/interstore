---
name: express-git
description: Versiona y revisa cambios de APIs Node.js/Express con SQLite con flujo Git/GitHub profesional — crea la rama, propone commits atómicos en Conventional Commits (convención de Angular) con las migraciones de esquema en su propio commit y los cambios incompatibles del contrato OpenAPI marcados como BREAKING CHANGE, abre el PR con gh y una plantilla con endpoints afectados, migraciones y plan de rollback, matriz requerimiento→test, resultados y resumen de seguridad, revisa el PR como reviewer senior (reversibilidad de migraciones, índices, compatibilidad del contrato; bloqueante / sugerencia / nit), publica y documenta la revisión y gestiona el ciclo de ajustes. Úsala siempre que haya que hacer commit, nombrar una rama, redactar un mensaje de commit, abrir, describir o revisar un pull request del backend, o responder a comentarios de revisión, aunque el usuario solo diga "súbelo" o "revisa el PR". No implementa ni audita (express-develop / express-sec).
---

# express-git — commits, PR y revisión (backend)

Conviertes un cambio verificado (tests en verde, auditoría aprobada) en una historia legible y un PR que un reviewer puede evaluar sin preguntar nada, incluido **cómo deshacerlo** si una migración sale mal. Después lo revisas con ojo crítico y documentas la revisión.

Contratos y estado: `.claude/workflow/express/handoff-contracts.md`, `.workflow/<feature>/state.md`. Convenciones Git comunes a todos los stacks: `.claude/workflow/shared/git/commit-conventions.md` y `.claude/workflow/shared/git/branching.md`.

## Precondiciones (verifícalas)
- `docs/security/<feature>-audit.md` con veredicto y **sin críticos ni altos abiertos**. Si está `BLOQUEADO`, detente.
- Reporte GREEN: suite, typecheck y build en verde; migraciones aplican desde cero.
- Convenciones del repo (`commitlint`, `.husky/`, `.github/pull_request_template.md`, `CONTRIBUTING.md`, README): mandan. Declara cuál usaste.

## 1. Rama
`<type>/<issue>-<descripcion-corta>` (p. ej. `feat/31-orders-checkout`). Nunca en ramas protegidas: `git switch -c <rama>` antes de commitear. Detalle en `shared/git/branching.md`.

## 2. Commits
Formato y reglas en `shared/git/commit-conventions.md`: `<type>(<scope>): <subject>`, subject en imperativo, minúscula, sin punto, ≤ 72 caracteres; body con motivación y contraste; footer `BREAKING CHANGE:` / `Closes #N`. Scopes de backend: módulo o feature (`users`, `auth`, `orders`, `db`). Idioma: el del repo (aquí, inglés).

**Estrategia por defecto** (decláralo en el PR):
1. `feat(db): add <tablas> migration`: **la migración en su propio commit**, para que se pueda revisar y revertir por separado. Si el repo prefiere un único commit, nómbrala en el body.
2. `test(<scope>): add specs for <feature>` (RED).
3. `feat(<scope>): implement <feature>` (GREEN).
4. `refactor(<scope>): …` (opcional).
5. `docs(<scope>): document <feature>, openapi and security audit`.

- Si el repo exige que cada commit pase CI, une test + feat o acuerda *squash merge*.
- Cambio incompatible del contrato (OpenAPI, forma de respuesta, códigos de error, rutas): `BREAKING CHANGE:` en el footer (y `!` tras el scope), con la migración para los clientes.
- Stagea archivos concretos (`git add <rutas>`): nunca `.env`, `*.db`/`*.sqlite`, `data/`, `.workflow/` ni `dist/`. Verifica con `git diff --cached --name-only` antes de cada commit.
- Nunca `--no-verify`.

## 3. Push y PR (puertas humanas)
Antes de `git push` y de `gh pr create`, pide confirmación explícita (bloque `PUERTA HUMANA` del agente) mostrando la rama, `git log --oneline <base>..HEAD` y el título.
- Sin remoto: propone `gh repo create …` o `git remote add …` (también es una puerta humana).
- `gh pr create --base <base> --head <rama> --title "<conventional commit>" --body-file <archivo>`.
- Cuerpo: plantilla del repo o `assets/pr-body.template.md` (contexto, cambios, **endpoints afectados**, **migraciones y plan de rollback**, matriz requerimiento→test, resultados, seguridad con enlace al informe, riesgos, checklist).
- Detalle: `references/pr-workflow.md`.

## 4. Revisión del PR
Revisa el diff completo (`gh pr diff <n>`) como reviewer senior con `.claude/skills/express-develop/references/pr-checklist.md` y la matriz (`.workflow/<feature>/test-matrix.md`). Ejes: correctitud, pruebas, seguridad, **reversibilidad e impacto de las migraciones**, índices y rendimiento de consultas, **compatibilidad del contrato**, manejo de errores, legibilidad, documentación y commits.
- Clasifica: **bloqueante** / **sugerencia** / **nit**.
- Publica con `gh pr review <n> --comment --body-file <archivo>` (en un PR propio GitHub solo permite `--comment`; el estado va en el cuerpo).
- Documenta en `docs/reviews/<feature>-pr-<n>.md` (`assets/pr-review.template.md`).
- Guía y ejemplos: `references/pr-review.md`.

## 5. Ciclo de ajustes (máx. 3 iteraciones)
Bloqueantes o sugerencias aceptadas (`references/adjustment-cycle.md`):
1. ¿Cambia el comportamiento o el esquema? → `express-test` (test en rojo; para migraciones, un test de migración).
2. `express-develop` → verde.
3. `express-sec` → solo el delta.
4. Commit **nuevo** de ajuste (`fix(<scope>)`, `refactor(<scope>)`, `test(<scope>)`, `feat(db)` para una migración correctiva). **Nunca edites una migración ya publicada o aplicada: crea otra.** Nunca reescribas historial publicado.
5. Push (puerta humana) → re-revisión del delta → documento de revisión actualizado.
6. Al agotar las iteraciones con bloqueantes: detente y escala.

## Prohibido
Merge sin orden explícita; push a ramas protegidas; `--force`/`--force-with-lease` sobre historial publicado; `--no-verify`; `git reset --hard`, `git clean` o borrar ramas sin confirmación; commitear secretos, bases de datos o `.workflow/`.

## Salida
Commits en la rama, URL del PR, `docs/reviews/<feature>-pr-<n>.md`, lista de ajustes y `state.md` (fase 4).

**Criterio de salida**: PR abierto con plan de rollback, revisión publicada y documentada, sin bloqueantes abiertos.
