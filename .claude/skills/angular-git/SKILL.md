---
name: angular-git
description: Versiona y revisa cambios de proyectos Angular con flujo Git/GitHub profesional — crea la rama, propone commits atómicos en Conventional Commits con la convención de Angular (feat, fix, test, docs, refactor…), abre el PR con gh y una plantilla con matriz requerimiento→test, resultados de pruebas y resumen de seguridad, revisa el PR como reviewer senior (bloqueante / sugerencia / nit), publica y documenta la revisión, y gestiona el ciclo de ajustes hasta dejar el PR sin bloqueantes. Úsala siempre que haya que hacer commit, nombrar una rama, redactar un mensaje de commit, abrir, describir o revisar un pull request, o responder a comentarios de revisión en un repo Angular, aunque el usuario solo diga "súbelo", "haz el commit" o "revisa el PR". No implementa ni audita código (angular-develop / angular-sec).
---

# angular-git — commits, PR y revisión

Conviertes un cambio verificado (tests en verde, auditoría aprobada) en una historia legible y un PR que un reviewer puede evaluar sin preguntar nada. Después lo revisas con ojo crítico, porque el autor de un cambio es el peor posicionado para ver sus huecos, y la revisión documentada es parte del entregable.

Contratos y estado: `.claude/workflow/angular/handoff-contracts.md`, `.workflow/<feature>/state.md`.

## Precondiciones (verifícalas, no las asumas)
- Veredicto de `angular-sec` emitido y **sin críticos ni altos abiertos** (`docs/security/<feature>-audit.md`). Si está `BLOQUEADO`, detente.
- Reporte GREEN con la suite completa en verde.
- Convenciones del repo: `commitlint.config.*`, `.husky/`, `.github/pull_request_template.md`, `CONTRIBUTING.md`, `CLAUDE.md` (en este repo, `frontend/CLAUDE.md` §15). Si existen, **mandan** sobre esta skill; declara cuál usaste.
- Si corres sin el orquestador, verifica igualmente que exista el informe de seguridad; si no existe, recomienda pasar primero por `angular-sec`.

## 1. Rama
- Formato: `<type>/<issue>-<descripcion-corta>` (p. ej. `feat/12-cart-optimistic`). Sin issue: `<type>/<descripcion-corta>`.
- **Nunca** trabajes directamente en ramas protegidas (`main`, `master`, `develop`, `release/*`). Si estás en una, crea la rama antes de commitear: `git switch -c <rama>`.
- Detalle en `.claude/workflow/shared/git/branching.md`.

## 2. Commits
Convención de Angular (`.claude/workflow/shared/git/commit-conventions.md`):
```
<type>(<scope>): <subject>

<body: motivación y contraste con el comportamiento previo>

<footer: BREAKING CHANGE: … / Closes #N>
```
- `type`: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`.
- `scope`: paquete o feature del repo (`frontend`, `catalog`, `cart`…). Usa los scopes que ya aparecen en `git log`.
- `subject`: imperativo, minúscula, sin punto final, **≤ 72 caracteres**.
- Idioma: el del repo (en este repo, inglés: revisa `git log --oneline`). Agrega los trailers que pida el entorno (p. ej. `Co-Authored-By`).

**Estrategia** (decláralo en el PR):
- Por defecto, **commits atómicos que cuentan la historia TDD**: `test(<scope>): …` (specs + esqueletos, RED) → `feat(<scope>): …` (GREEN) → `refactor(<scope>): …` (si aplica) → `docs(<scope>): …` (doc de la feature y del informe de seguridad).
- Si la convención del repo exige que cada commit pase CI (un commit `test` en rojo rompería `main` en un merge sin squash), une test + feat en un solo commit o usa *squash merge*. Decide y justifica.
- Cada commit compila y tiene sentido por sí mismo. Nada de "WIP" ni "fix typo" sueltos en el PR final.
- Stagea **archivos concretos** (`git add <rutas>`), nunca `git add -A` a ciegas: evita colar `.workflow/`, `.env` o artefactos.
- Nunca `--no-verify`. Si un hook falla, corrige la causa.

## 3. Push y PR — puertas humanas
Antes de `git push` y antes de `gh pr create`, **pide confirmación explícita** (bloque `PUERTA HUMANA` del agente). Muestra la rama, los commits (`git log --oneline <base>..HEAD`) y el título del PR.
- Sin remoto: detente y propone el comando (`gh repo create …` o `git remote add origin …`). Crear un repositorio también es una puerta humana.
- PR con `gh pr create --base <base> --head <rama> --title "<conventional commit>" --body-file <archivo>`.
- Cuerpo: `.github/pull_request_template.md` si existe; si no, `assets/pr-body.template.md` (contexto, cambios, matriz requerimiento→test, resultados de tests, resumen de seguridad con enlace al informe, riesgos, capturas si aplica, checklist).
- Detalle: `references/pr-workflow.md`.

## 4. Revisión del PR
Revisa el **diff completo del PR** (`gh pr diff <n>`) como reviewer senior, no como autor:
1. Usa `.claude/skills/angular-develop/references/pr-checklist.md` y la matriz de trazabilidad (`.workflow/<feature>/test-matrix.md`).
2. Ejes: correctitud, pruebas, seguridad, rendimiento, accesibilidad, legibilidad, documentación y estilo de commits.
3. Clasifica cada comentario: **bloqueante** (debe cambiar antes del merge), **sugerencia** (mejora recomendable; el autor decide con justificación) o **nit** (menor u opcional).
4. Publica la revisión con `gh pr review <n> --comment --body-file <archivo>` (previa confirmación si el usuario lo pidió así). GitHub no permite aprobar ni pedir cambios sobre un PR propio: usa `--comment` y marca el estado en el cuerpo.
5. Documenta en `docs/reviews/<feature>-pr-<n>.md` con `assets/pr-review.template.md`.

Guía completa y ejemplos de comentarios: `references/pr-review.md`.

## 5. Ciclo de ajustes (máx. 3 iteraciones)
Si hay bloqueantes o sugerencias aceptadas (`references/adjustment-cycle.md`):
1. ¿Cambia el comportamiento? → `angular-test` (test nuevo o de regresión en rojo). Si no cambia (refactor, docs) → directo a `angular-develop`.
2. `angular-develop` → verde.
3. `angular-sec` → auditoría **solo del delta**.
4. Commit de ajuste **nuevo** (`fix(<scope>): …`, `refactor(<scope>): …`, `test(<scope>): …` o `fixup! <subject>` si el repo hace autosquash antes del merge). **Nunca reescribas historial ya publicado.**
5. Push (puerta humana) → el PR se actualiza → re-revisión del delta → actualización del documento de revisión (cada ajuste queda registrado).
6. Al agotar las iteraciones con bloqueantes abiertos: detente y escala.

## Prohibido
- Merge de cualquier tipo sin una orden explícita del usuario.
- Push a ramas protegidas, `--force` / `--force-with-lease` sobre historial publicado, `--no-verify`.
- `git reset --hard`, `git clean`, borrar ramas o cerrar PRs sin confirmación.
- Commitear secretos, `.env`, `.workflow/` o artefactos de build.

## Salida
1. Commits en la rama (lista `git log --oneline <base>..HEAD`).
2. URL del PR.
3. `docs/reviews/<feature>-pr-<n>.md`.
4. Lista de ajustes aplicados o pendientes y `state.md` actualizado (fase 4).

**Criterio de salida**: PR abierto, revisión publicada y documentada, sin bloqueantes abiertos (las sugerencias rechazadas quedan justificadas).
