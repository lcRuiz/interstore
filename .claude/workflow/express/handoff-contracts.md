# Contratos de traspaso: backend Express + SQLite

Fuente de verdad compartida por `express-dev-agent` y las skills `express-test`, `express-develop`, `express-sec` y `express-git`. Si una skill necesita algo que no está en su contrato de entrada, lo pide; no lo inventa. Las convenciones Git son comunes a todos los stacks: `.claude/workflow/shared/git/`.

```
Contexto/requerimiento (+ OpenAPI si existe)
   ▼
[1] express-test    → specs + esqueletos + fixtures + reporte RED
   ▼
[2] express-develop → GREEN + migraciones + refactor + docs + OpenAPI
   ▼
[3] express-sec     → auditoría OWASP del diff + reglas para develop
   │   (hallazgo → test de regresión rojo → fix → verde → re-auditar delta)
   ▼
[4] express-git     → commits → PR (con plan de rollback) → revisión → (ajustes: volver a 1/2)
```

## Tabla de contratos

| De → A | Entrega | Criterio de salida |
|---|---|---|
| Orquestador → test | Requerimiento, supuestos, convenciones del repo, entorno detectado, OpenAPI si existe | Contexto sin ambigüedades críticas |
| test → develop | Specs, esqueletos, fixtures/factories, matriz, reporte RED | Todos los fallos ✅ esperados |
| develop → sec | Rama con cambios, migraciones, reporte GREEN, `docs/features/<feature>.md`, OpenAPI actualizado, lista de archivos | 100 % de tests en verde, sin tests alterados sin justificación |
| sec → develop | Hallazgos + reglas en `express-develop/references/security-rules.md` | Veredicto emitido |
| sec → git | `docs/security/<feature>-audit.md`, veredicto | Sin hallazgos críticos/altos abiertos |
| git → orquestador | URL del PR, `docs/reviews/<feature>-pr-<n>.md`, lista de ajustes | PR sin bloqueantes abiertos |

## Detalle por traspaso

### Orquestador → `express-test`
- **Entrada**: requerimiento, criterios de aceptación, supuestos, entorno (Express 4/5, driver, runner, formato de error), modelo de datos esperado, reglas de autenticación/autorización, OpenAPI si existe.
- **Bloquea si**: hay ambigüedad en el contrato HTTP, en quién puede acceder a qué (autorización) o en las reglas de datos (unicidad, borrado en cascada).

### `express-test` → `express-develop`
- **Artefactos**: specs `*.test.ts` (unitarias de dominio, integración de repositorio con SQLite `:memory:`, HTTP con `supertest`); esqueletos (rutas que responden `501`, funciones que lanzan `Not implemented`, migración vacía o mínima); factories de datos sintéticos; `.workflow/<feature>/test-matrix.md`; `.workflow/<feature>/red-report.md` con la salida real.
- **Criterio**: compila (`tsc --noEmit` si es TS), el runner ejecuta y cada fallo es ✅ (aserción, `501` o `Not implemented` donde corresponde). Los tests previos siguen en verde.

### `express-develop` → `express-sec`
- **Artefactos**: implementación; migraciones nuevas (lista con nombre/versión); `.workflow/<feature>/green-report.md` (total, pasados, cobertura de líneas y ramas si hay, typecheck/lint); `docs/features/<feature>.md`; `openapi.yaml` actualizado; lista de archivos (`git diff --name-only <base>` + nuevos); cambios a tests justificados (idealmente ninguno).
- **Criterio**: suite completa en verde; las migraciones aplican desde cero sobre `:memory:`; typecheck, lint y build sin errores.

### `express-sec` → `express-develop` (remediación)
- **Artefactos**: hallazgos `SEC-<feature>-NN` y reglas nuevas o refinadas en `security-rules.md`.
- **Criterio**: veredicto emitido; cada hallazgo accionable entra al bucle (máx. 3).

### `express-sec` → `express-git`
- **Artefactos**: `docs/security/<feature>-audit.md` con veredicto `APROBADO`, `APROBADO CON RIESGO ACEPTADO` (aceptación del usuario registrada) o `BLOQUEADO`.
- **Criterio**: sin críticos ni altos abiertos.

### `express-git` → orquestador
- **Artefactos**: commits (las migraciones identificadas), URL del PR (con plan de rollback de migraciones), `docs/reviews/<feature>-pr-<n>.md`, ajustes aplicados o pendientes.
- **Criterio**: ningún bloqueante abierto; sugerencias rechazadas justificadas.

## Rutas estándar

| Artefacto | Ruta | ¿Versionado? |
|---|---|---|
| Estado, matriz, reportes RED/GREEN | `.workflow/<feature>/` | No (`.gitignore`) |
| Documentación de la feature | `docs/features/<feature>.md` | Sí |
| Contrato OpenAPI | `<raíz del backend>/openapi.yaml` (o la ruta existente) | Sí |
| Migraciones | Las del repo (p. ej. `backend/src/db/migrations/NNNN_<nombre>.ts`) | Sí |
| Informe de seguridad | `docs/security/<feature>-audit.md` | Sí |
| Reglas de codificación segura | `.claude/skills/express-develop/references/security-rules.md` | Sí |
| Revisión del PR | `docs/reviews/<feature>-pr-<n>.md` | Sí |

`docs/` está en la raíz del repositorio y lo comparten frontend y backend. Si una feature es full-stack, se usa el mismo `<feature>` con sufijos (`<feature>-api`, `<feature>-web`) para no pisar documentos.
