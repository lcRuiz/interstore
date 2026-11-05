# Contratos de traspaso

Fuente de verdad compartida por `angular-dev-agent` y las skills `angular-test`, `angular-develop`, `angular-sec` y `angular-git`. Si una skill necesita algo que no está en su contrato de entrada, lo pide al orquestador (o al usuario si corre sola), no lo inventa.

```
Contexto/requerimiento
   │
   ▼
[1] angular-test    → specs + esqueletos mínimos + reporte RED
   ▼
[2] angular-develop → GREEN + refactor + documentación
   ▼
[3] angular-sec     → auditoría OWASP del diff + reglas para develop
   │   (hallazgo → test de regresión rojo → fix → verde → re-auditar delta)
   ▼
[4] angular-git     → commits → PR → revisión → (ajustes: volver a 1/2)
```

## Tabla de contratos

| De → A | Entrega | Criterio de salida |
|---|---|---|
| Orquestador → test | Requerimiento, supuestos, convenciones del repo, entorno detectado | Contexto sin ambigüedades críticas |
| test → develop | Specs, esqueletos, matriz requerimiento→test, reporte RED | Todos los fallos ✅ esperados (ninguno por compilación/import/config) |
| develop → sec | Rama con cambios, reporte GREEN, `docs/features/<feature>.md`, lista de archivos modificados | 100 % de tests en verde, lint ok, sin tests alterados sin justificación |
| sec → develop | Hallazgos + reglas en `angular-develop/references/security-rules.md` | Veredicto emitido |
| sec → git | `docs/security/<feature>-audit.md`, veredicto | Sin hallazgos críticos/altos abiertos |
| git → orquestador | URL del PR, `docs/reviews/<feature>-pr-<n>.md`, lista de ajustes | PR sin bloqueantes abiertos |

## Detalle por traspaso

### Orquestador → `angular-test`
- **Entrada**: requerimiento textual, criterios de aceptación (si existen), supuestos, raíz de la app, runner, convenciones (`CLAUDE.md`), feature en kebab-case.
- **Bloquea si**: hay una ambigüedad que cambia el contrato (forma de la API, regla de negocio, permisos). Se registra como decisión pendiente y se pregunta.

### `angular-test` → `angular-develop`
- **Artefactos**:
  - Specs `*.spec.ts` junto a los archivos que prueban.
  - Esqueletos mínimos que compilan (métodos que lanzan `Error('Not implemented')` o devuelven un valor neutro).
  - Matriz en `.workflow/<feature>/test-matrix.md`.
  - Reporte RED en `.workflow/<feature>/red-report.md` con la salida real del runner.
- **Criterio**: el runner compila y ejecuta; cada test que falla lo hace por **aserción** sobre el comportamiento pendiente. Cero fallos ❌ inválidos.

### `angular-develop` → `angular-sec`
- **Artefactos**:
  - Implementación en la rama de la feature.
  - Reporte GREEN en `.workflow/<feature>/green-report.md` (total, pasados, cobertura si hay, lint).
  - `docs/features/<feature>.md`.
  - Lista de archivos modificados (`git diff --name-only <base>...HEAD` + nuevos sin trackear).
  - Lista de cambios a tests con justificación (idealmente vacía).
- **Criterio**: 100 % verde en la corrida completa (no solo los tests nuevos); lint y build sin errores.

### `angular-sec` → `angular-develop` (bucle de remediación)
- **Artefactos**: hallazgos accionables con ID (`SEC-<feature>-NN`) y reglas nuevas o refinadas en `security-rules.md`.
- **Criterio**: veredicto emitido. Cada hallazgo accionable entra al bucle test rojo → fix → verde → re-auditoría del delta (máx. 3 iteraciones).

### `angular-sec` → `angular-git`
- **Artefactos**: `docs/security/<feature>-audit.md` y veredicto `APROBADO`, `APROBADO CON RIESGO ACEPTADO` o `BLOQUEADO`.
- **Criterio**: sin críticos ni altos abiertos. `APROBADO CON RIESGO ACEPTADO` exige que el usuario haya aceptado el riesgo por escrito (registrado en el estado).

### `angular-git` → orquestador
- **Artefactos**: commits en la rama, URL del PR, `docs/reviews/<feature>-pr-<n>.md`, lista de ajustes aplicados o pendientes.
- **Criterio**: ningún comentario bloqueante abierto. Las sugerencias rechazadas quedan justificadas en el documento de revisión.

## Rutas estándar

| Artefacto | Ruta | ¿Versionado? |
|---|---|---|
| Estado del flujo | `.workflow/<feature>/state.md` | No (`.gitignore`), es trabajo local |
| Matriz y reportes RED/GREEN | `.workflow/<feature>/` | No; se resumen en el PR |
| Documentación de la feature | `docs/features/<feature>.md` | Sí |
| Informe de seguridad | `docs/security/<feature>-audit.md` | Sí |
| Reglas de codificación segura | `.claude/skills/angular-develop/references/security-rules.md` | Sí |
| Revisión del PR | `docs/reviews/<feature>-pr-<n>.md` | Sí |

`docs/` vive en la raíz del repositorio. Si el repo ya tiene otra carpeta de documentación, se usa esa y se registra en los supuestos.
