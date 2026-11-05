# Convención de commits (Angular / Conventional Commits)

Fuente: guía de contribución de Angular (`https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md`). Si el repo tiene commitlint, sus reglas mandan.

## Formato
```
<type>(<scope>): <subject>
<línea en blanco>
<body>
<línea en blanco>
<footer>
```

## Tipos
| Tipo | Uso | Ejemplo |
|---|---|---|
| `feat` | Funcionalidad nueva visible | `feat(cart): add optimistic quantity updates` |
| `fix` | Corrección de un bug | `fix(catalog): keep page when category filter is cleared` |
| `test` | Tests nuevos o corregidos, sin código de producción | `test(cart): add specs for optimistic add and rollback` |
| `refactor` | Cambio sin efecto funcional | `refactor(catalog): extract query params mapping` |
| `perf` | Mejora de rendimiento | `perf(catalog): defer product grid below the fold` |
| `docs` | Solo documentación | `docs(cart): document cart feature and security audit` |
| `style` | Formato (espacios, comas), sin cambios de lógica | `style(frontend): apply prettier` |
| `build` | Build, dependencias | `build(frontend): add lucide-angular` |
| `ci` | Pipelines | `ci: run lint and tests on pull requests` |
| `chore` | Mantenimiento que no encaja en otro tipo | `chore: ignore workflow state folder` |
| `revert` | Revertir un commit | `revert: feat(cart): add optimistic quantity updates` |

## Reglas del subject
- Imperativo y presente: "add", no "added" ni "adds".
- Primera letra en minúscula, sin punto final.
- ≤ 72 caracteres en la primera línea completa (`type(scope): subject`).
- Dice **qué** cambia para el usuario o el código, no cómo se hizo.

| Mal | Bien |
|---|---|
| `feat: Cambios en carrito.` | `feat(cart): add optimistic remove with rollback` |
| `fix(cart): fixed bug` | `fix(cart): restore item when remove request fails` |
| `update stuff` | `refactor(core): centralize api error mapping` |

## Body
- Motivación: por qué hace falta el cambio.
- Contraste: comportamiento anterior → comportamiento nuevo.
- Líneas de ~72 columnas. Opcional en cambios triviales.

## Footer
- `BREAKING CHANGE: <descripción y migración>` cuando cambia un contrato público (API de un componente o servicio compartido, rutas, contrato HTTP).
- `Closes #N` / `Refs #N` para issues.
- Trailers del entorno (p. ej. `Co-Authored-By: …`) al final.

## Ejemplo completo
```
feat(cart): add optimistic quantity updates

Updating the quantity used to wait for the server, which made the
cart feel slow. The store now applies the change immediately,
reconciles with the server response and rolls back on failure.
Points are still only updated from the server response.

Closes #12
```

## Estrategia TDD (por defecto)
1. `test(<scope>): add specs for <feature>` (RED: specs + esqueletos)
2. `feat(<scope>): implement <feature>` (GREEN)
3. `refactor(<scope>): …` (opcional)
4. `docs(<scope>): document <feature> and security audit`

Si el repo no tolera commits en rojo en `main` (merge sin squash + CI por commit), combina 1 y 2 o acuerda *squash merge*; decláralo en el PR.
