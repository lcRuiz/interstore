---
name: express-develop
description: Implementa APIs Node.js/Express con SQLite en modo TDD (fase GREEN) — escribe el código mínimo para pasar los tests existentes con arquitectura por capas (routes → controllers → services → repositories), createApp(deps), errores tipados y formato de error único, validación con esquema en el borde, configuración validada al arrancar, consultas siempre parametrizadas, PRAGMAs, transacciones y migraciones versionadas de SQLite; después refactoriza y documenta lo implementado (docs de la feature, OpenAPI, TSDoc) aplicando las reglas de codificación segura registradas por express-sec. Úsala siempre que haya que escribir o refactorizar código de producción del backend (endpoints, servicios, repositorios, middlewares, migraciones), pasar tests de rojo a verde, migrar código Express legado o documentar un endpoint, aunque el usuario solo diga "impleméntalo" o "haz que pasen los tests". No diseña tests (express-test), no audita (express-sec) ni versiona (express-git).
---

# express-develop — fase GREEN + refactor + documentación

Implementas contra los tests de `express-test`. Los tests son la especificación: haz que pasen con el diseño más simple que respete la arquitectura del repo, después mejora el diseño sin romperlos y, por último, documenta lo que **realmente** construiste.

Contratos y estado: `.claude/workflow/express/handoff-contracts.md`, `.workflow/<feature>/state.md`.

## Antes de escribir código (siempre)
1. **Lee `references/security-rules.md`**: reglas aprendidas en auditorías previas. Aplicarlas desde el diseño es más barato que corregirlas en `express-sec`.
2. Lee las convenciones del repo (README del backend, estructura de `src/`, formato de error, `createApp`, validación). Mandan sobre esta skill.
3. Lee la matriz y el reporte RED. Sin RED válido (fallos ❌ o inexistente): **detente**.
4. Ante dudas sobre una API de Express, del driver SQLite o de Zod, consulta la documentación oficial **de la versión instalada** (`npm ls <paquete>`). No inventes opciones.
5. Nunca leas `.env` ni bases reales; usa `.env.example` y `:memory:`.

## Arquitectura (resumen; detalle en `references/architecture.md`)
```
routes (montaje, middlewares, validación)
  → controllers (HTTP: req → DTO → servicio → respuesta)
    → services (reglas de negocio, transacciones; no conocen req/res)
      → repositories (SQL parametrizado; no conocen HTTP ni reglas)
```
- Controladores sin SQL ni reglas de negocio. Servicios sin `req`/`res`. Repositorios sin `AppError` de HTTP (lanzan errores de dominio o devuelven `undefined`; el servicio decide).
- `createApp(deps)` recibe dependencias (db, reloj, logger, clientes externos) para que los tests inyecten dobles.
- En proyectos pequeños, controller y routes pueden ir en un archivo `*.routes.ts` si el repo ya lo hace así; respeta la convención existente y no la mezcles.

## Ciclo GREEN
Orden: dominio → migración/repositorio → servicio → controlador/ruta → OpenAPI.

Por bloque:
1. Implementa lo mínimo para pasar los tests del bloque.
2. Ejecuta `npm run typecheck` y la suite (filtrada mientras iteras; completa al cerrar el bloque).
3. Si sigue en rojo, el problema está en tu código: revisa el mensaje y el contrato, no el test.

### Regla de oro sobre los tests
**Prohibido modificar, eliminar, saltar (`skip`/`only`) o relajar un test para que pase.** Solo cambia ante: (a) un error demostrable del test (con evidencia, registrado en el reporte GREEN), o (b) un cambio de requerimiento, que se devuelve como decisión pendiente con puerta humana. Tras 3 iteraciones sin éxito, escala con la evidencia.

## Reglas de implementación (detalle en las referencias)
| Tema | Regla | Referencia |
|---|---|---|
| Errores | `AppError` tipado (status + código de negocio), middleware central, formato único del repo (o RFC 9457 si es el estándar del repo), sin stack ni SQL en respuestas | `error-handling.md` |
| Express | Express 5: async nativo; Express 4: `asyncHandler`. Validación en el borde, límites de body, `trust proxy` explícito, `x-powered-by` desactivado | `express-patterns.md` |
| Config | Variables de entorno validadas al arrancar (falla rápido); `.env.example` actualizado; nunca secretos en el código | `config-and-env.md` |
| SQL | **Siempre parametrizado**; columnas y orden dinámicos solo desde una lista blanca; `LIKE` con escape | `sqlite-patterns.md` |
| SQLite | `foreign_keys = ON` en cada conexión, WAL + `busy_timeout` según el caso, transacciones multi-sentencia, una sentencia por llamada, tablas `STRICT` si la versión lo soporta | `sqlite-patterns.md` |
| Migraciones | Versionadas, ordenadas, revisables, aplicadas en una transacción; `down` si el repo lo exige; índices justificados por consultas reales | `sqlite-patterns.md` |
| API | REST, códigos HTTP correctos, paginación por defecto con máximo, orden estable, idempotencia donde importa | `api-design.md` |
| Logs | Estructurados, con id de correlación, **redactando** datos sensibles | `observability.md` |
| Concurrencia | Un único escritor; documenta límites (multi-proceso, escalado) y cuándo migrar de motor | `sqlite-patterns.md` § Concurrencia |

## Refactor (con todo en verde)
Revisa contra `references/anti-patterns.md` y `references/pr-checklist.md`. El refactor no agrega comportamiento: si quieres algo nuevo, primero un test (`express-test`).

## Calidad antes de cerrar
```bash
cd backend
npm run typecheck
npm test                 # suite completa
npm run lint             # si existe
npm run build
```
Verifica también que las migraciones aplican desde cero (`openDatabase(':memory:')` en los tests lo cubre). **No ejecutes migraciones ni `db:reset` sobre archivos `.sqlite` sin la puerta humana del orquestador.**

## Documentación (después de GREEN y refactor)
Lo implementado, no lo planeado (`references/documentation.md`):
1. **TSDoc** en la API pública de servicios y repositorios, y en los esquemas y DTOs del contrato.
2. **`docs/features/<feature>.md`** (`assets/feature-doc.template.md`): propósito, decisiones, endpoints, modelo de datos y migraciones, errores, supuestos, cómo probar y ejecutar.
3. **`openapi.yaml`** actualizado (o creado con `assets/openapi-path.template.md` si no existe y el usuario lo aprueba como supuesto): rutas, parámetros, esquemas, respuestas de error. Debe coincidir con los tests.

## Salida
1. Implementación + migraciones.
2. `.workflow/<feature>/green-report.md` (`assets/green-report.template.md`): total, pasados, cobertura de líneas y ramas si hay, typecheck/lint/build, migraciones, archivos modificados, **cambios a tests justificados (idealmente vacía)**.
3. Docs de la feature, OpenAPI y TSDoc.
4. `state.md` (fase 2, migraciones creadas).

**Criterio de salida**: suite completa en verde, typecheck/lint/build ok, migraciones aplican desde cero, sin tests alterados sin justificación, documentación creada.

## Modo remediación
Recibes un hallazgo `SEC-<feature>-NN` o un comentario de revisión con su test ya en rojo: corrige la causa raíz con el cambio mínimo, pasa el test y la suite, y anótalo en la sección Remediaciones del reporte GREEN. Si el fix cambia el contrato, actualiza OpenAPI y la doc.

## Legado
Código sin capas, SQL concatenado, Express 4 sin manejo de errores async o esquema sin migraciones: `references/migration-legacy.md` (siempre con tests de caracterización primero).

## Referencias
| Archivo | Cuándo |
|---|---|
| `references/security-rules.md` | **Siempre**, antes de implementar |
| `references/architecture.md` | Al ubicar código nuevo |
| `references/express-patterns.md` | Middlewares, rutas, validación, Express 4/5 |
| `references/sqlite-patterns.md` | Conexión, PRAGMAs, consultas, transacciones, migraciones, índices, concurrencia |
| `references/error-handling.md` | Errores tipados y formato |
| `references/config-and-env.md` | Variables de entorno y arranque |
| `references/api-design.md` | Rutas, códigos, paginación, idempotencia, versionado |
| `references/observability.md` | Logging y redacción |
| `references/documentation.md` | Docs de la feature, OpenAPI y TSDoc |
| `references/anti-patterns.md` | Refactor |
| `references/pr-checklist.md` | Antes de cerrar |
| `references/migration-legacy.md` | Código legado |
