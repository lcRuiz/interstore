# Flujos de desarrollo con agentes

Dos flujos con la misma forma (test → develop → sec → git), cada uno con su agente orquestador y cuatro skills especializadas:

| Stack | Agente | Skills | Documentación |
|---|---|---|---|
| Frontend Angular 21 (`frontend/`) | `angular-dev-agent` | `angular-test` · `angular-develop` · `angular-sec` · `angular-git` | [angular/README.md](angular/README.md) |
| Backend Express + SQLite (`backend/`) | `express-dev-agent` | `express-test` · `express-develop` · `express-sec` · `express-git` | [express/README.md](express/README.md) |

## Qué es compartido (agnóstico al stack)
| Pieza | Ruta | Lo usan |
|---|---|---|
| Convención de commits (Conventional Commits) | `shared/git/commit-conventions.md` | `angular-git`, `express-git` |
| Ramas | `shared/git/branching.md` | `angular-git`, `express-git` |
| Motor del escáner de diff | `shared/scripts/scan-diff-core.mjs` | `angular-sec/scripts/scan-diff.mjs`, `express-sec/scripts/scan-diff.mjs` (cada uno con sus reglas y su carpeta: `frontend/` o `backend/`) |
| Carpeta de estado | `.workflow/<feature>/` (no versionada) | ambos agentes |
| Documentos generados | `docs/features/`, `docs/security/`, `docs/reviews/` | ambos flujos (sufijos `-web`/`-api` en features full-stack) |

El contenido de cada stack (pruebas, patrones, checklist OWASP, plantillas de PR) es propio de su skill y no se mezcla.

## Elegir el flujo
- Cambio solo en `frontend/` → `angular-dev-agent`.
- Cambio solo en `backend/` → `express-dev-agent`.
- Feature full-stack → primero el backend (contrato y OpenAPI), después el frontend contra ese contrato, en dos ramas y dos PRs (o en uno, declarado).
