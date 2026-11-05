# Flujo de desarrollo backend (Express + SQLite) con agentes

`express-dev-agent` encadena cuatro skills con criterios de salida, límite de iteraciones (3) y puertas humanas:

```
Contexto/requerimiento (+ OpenAPI si existe)
   ▼
[1] express-test    → specs (unit · SQLite :memory: · HTTP supertest) + esqueletos + RED
   ▼
[2] express-develop → GREEN + migraciones + refactor + docs + OpenAPI
   ▼
[3] express-sec     → auditoría OWASP Top 10:2025 SOLO del diff (código, migraciones, dependencias)
   │   (hallazgo → test de regresión rojo → fix → verde → re-auditar delta)
   ▼
[4] express-git     → commits (migración aparte) → PR con plan de rollback → revisión → ajustes
```

| Pieza | Responsabilidad (sin solapamiento) |
|---|---|
| `express-dev-agent` | Orquesta, verifica criterios de salida, mantiene el estado, pide confirmaciones |
| `express-test` | Diseña y verifica pruebas (RED) |
| `express-develop` | Implementa, migra y documenta (GREEN) |
| `express-sec` | Audita el diff y alimenta `security-rules.md` |
| `express-git` | Versiona, abre y revisa el PR |

## Supuestos detectados en este repo (2026-11-05)
| Elemento | Valor |
|---|---|
| Node / módulos | 24.x · ESM · TypeScript strict |
| Express | 5.3 (errores async nativos: no hace falta `asyncHandler`) |
| SQLite | `node:sqlite` (en la doc de Node más reciente: estabilidad 1.2, release candidate, y `DatabaseSync` como alias de `Database`; verificar en la doc de la versión instalada) |
| Esquema | Idempotente (`CREATE TABLE IF NOT EXISTS` en `src/db/schema.ts`); la primera feature que cambie el esquema introduce migraciones versionadas |
| Validación / errores | Zod 4 · `{ error: { code, message, details? } }` (se respeta en lugar de RFC 9457) |
| Pruebas | Vitest 3 + supertest · `createApp({ db })` · base `:memory:` |
| Identidad | `X-User-Id` simulado (sin seguridad; riesgo aceptado del supuesto) |
| OpenAPI | No existe aún: lo crea la primera feature, solo con sus endpoints |

## Puertas humanas
`git push`, abrir el PR, publicar la revisión, cambiar un test existente por cambio de requerimiento, **migrar una base que no sea `:memory:` o la local declarada**, **borrar o recrear `.sqlite`/`.db`** (incluido `npm run db:reset`), instalar dependencias y cualquier acción destructiva. Nunca: merge, `--force`, push a ramas protegidas, leer `.env` o datos reales.

## Árbol
```
.claude/
├── agents/express-dev-agent.md
├── skills/
│   ├── express-test/
│   │   ├── SKILL.md
│   │   ├── references/  test-design · http-supertest · sqlite-testing · auth-testing
│   │   │                error-handling-testing · runner-setup · anti-patterns
│   │   └── assets/      spec-http.template · spec-repository.template · test-matrix.template · red-report.template
│   ├── express-develop/
│   │   ├── SKILL.md
│   │   ├── references/  security-rules (lo escribe express-sec) · architecture · express-patterns
│   │   │                sqlite-patterns · error-handling · config-and-env · api-design · observability
│   │   │                documentation · anti-patterns · pr-checklist · migration-legacy
│   │   └── assets/      feature-doc.template · green-report.template · openapi-path.template
│   ├── express-sec/
│   │   ├── SKILL.md
│   │   ├── references/  owasp-mapping · express-checklist · sqlite-security · auth-jwt-sessions · report-template
│   │   ├── assets/      security-rule.template
│   │   └── scripts/     scan-diff.mjs (35 reglas sobre el motor compartido)
│   └── express-git/
│       ├── SKILL.md
│       ├── references/  pr-workflow · pr-review · adjustment-cycle
│       └── assets/      pr-body.template · pr-review.template
└── workflow/
    ├── shared/git/                 commit-conventions · branching (agnósticos al stack)
    ├── shared/scripts/             scan-diff-core.mjs (motor del escáner de diff)
    └── express/
        ├── README.md               este archivo
        ├── handoff-contracts.md
        ├── state-template.md
        └── evals/                  6 casos end-to-end

Generado por el flujo:
.workflow/<feature>/                estado, matriz, reportes RED/GREEN (no versionado)
backend/openapi.yaml                contrato
backend/src/db/migrations/…         migraciones versionadas
docs/features/<feature>.md
docs/security/<feature>-audit.md
docs/reviews/<feature>-pr-<n>.md
```

## Evals end-to-end
| Caso | Qué valida |
|---|---|
| `crud-with-migration` | CRUD de reseñas con migración versionada, IDOR, UNIQUE, flujo completo y puerta humana |
| `auth-role-endpoint` | Rol con migración, `requireRole`, rol nunca desde el body, y la auditoría señala la sesión simulada en una función de admin |
| `validation-pagination-errors` | Paginación con máximo, `sort` en lista blanca, `LIKE` escapado, `meta.total` coherente, 500 sin fugas |
| `security-sqli-idor` | Inyección SQL + IDOR plantados: detección, tests de regresión, fix, re-auditoría del delta, reglas refinadas |
| `pr-review-migration-adjustments` | Revisión con una migración irreversible y un índice faltante: migración correctiva nueva, plan de rollback, ronda 2 |
| `legacy-coverage-before-refactor` | Caracterización → hallazgo de inyección → refactor a capas → regla nueva con TDD y reloj inyectado |

Formato `claude plugin eval` (`prompt.md`, `case.yaml`, `graders/`, `files/` + `place-files.sh`). Corren sobre una copia de este repositorio; `pr-review-migration-adjustments` necesita la rama `feat/31-orders-checkout`.

```bash
cd .claude/workflow/express && claude plugin eval . --allow-tools Write,Edit,Bash --scaffold
```
(Son ejecuciones reales y facturadas. Si la CLI exige que los casos estén dentro de una skill, cópialos a `.claude/skills/<skill>/evals/`.)
