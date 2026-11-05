---
name: express-test
description: Diseña y escribe las pruebas ANTES de implementar (fase RED de TDD) en APIs Node.js/Express con SQLite — matriz requerimiento→casos, tests unitarios de dominio, integración de repositorios contra SQLite real en memoria con las migraciones reales, integración HTTP con supertest sobre createApp(deps), casos de autenticación/autorización, validación, paginación, errores uniformes, constraints y transacciones, más esqueletos mínimos (rutas 501, funciones Not implemented) y un reporte RED que demuestra que cada test falla por la razón correcta. Úsala siempre que haya que escribir o diseñar tests de backend Express/SQLite, empezar un endpoint o CRUD con TDD, cubrir código legado sin pruebas antes de refactorizar, o crear un test de regresión para un bug o hallazgo de seguridad (inyección SQL, IDOR), aunque el usuario solo diga "agrega tests" o "primero las pruebas". No implementa lógica de producción (eso es express-develop).
---

# express-test — fase RED

Conviertes un requerimiento en **pruebas ejecutables que fallan por la razón correcta**. Un test que falla por un import roto, un error de TypeScript o una tabla inexistente no prueba nada: solo demuestra que el entorno está mal.

Contratos y estado: `.claude/workflow/express/handoff-contracts.md` y `.workflow/<feature>/state.md` (si corres sin orquestador, créalo con `.claude/workflow/express/state-template.md`).

## Entrada esperada
Requerimiento, supuestos, entorno (Express 4/5, driver SQLite, runner, formato de error, `createApp`), reglas de auth y de datos, OpenAPI si existe. Si falta el contrato HTTP, la regla de autorización o una regla de datos crítica, **pregunta antes**: un test sobre un contrato inventado obliga a reescribirlo después.

## Estrategia: pirámide para API + SQLite

| Nivel | Qué prueba | Base de datos | Referencia |
|---|---|---|---|
| Unitario | Reglas de dominio puras (cálculos, validaciones, políticas) | Ninguna | `references/test-design.md` |
| Integración de repositorio/servicio | SQL real, constraints, transacciones, migraciones | **SQLite `:memory:` + migraciones reales** | `references/sqlite-testing.md` |
| Integración HTTP | Rutas, middlewares, validación, status, cuerpos, headers, formato de error | `:memory:` vía `createApp(deps)` | `references/http-supertest.md` |
| Contrato | Respuestas conformes al OpenAPI (si existe) | — | `references/http-supertest.md` § Contrato |

**Por defecto se prueba contra SQLite real en memoria, no contra mocks de la base**: es rápido y detecta errores de SQL, constraints y migraciones que un mock oculta. Los mocks se usan solo en fronteras externas: HTTP saliente, reloj, email, generadores de IDs o aleatorios.

## Fase 0 — Análisis y matriz
Extrae, sin implementar:
1. Requerimientos (R*) y reglas de negocio (RN*).
2. Contrato: método, ruta, params/query/body, respuesta, códigos y cuerpo de error (en el formato del repo).
3. Auth: quién está autenticado, qué roles o propiedad se exigen (A*).
4. Datos: tablas, constraints (`UNIQUE`, `NOT NULL`, `FOREIGN KEY`, `CHECK`), borrado/cascada, índices esperados (D*).
5. Casos borde: vacíos, límites, duplicados, concurrencia, payloads grandes o con campos extra.
6. **Matriz requerimiento → casos** con `assets/test-matrix.template.md` en `.workflow/<feature>/test-matrix.md`.

### Casos obligatorios por endpoint
| Caso | Status típico | Notas |
|---|---|---|
| Camino feliz | 200/201/204 | Cuerpo y headers (`Location` en 201) |
| Validación | 400 (o 422 si el repo lo usa) | Body, query y params; formato de error uniforme |
| No autenticado | 401 | Si el endpoint requiere sesión |
| No autorizado | 403 (o 404 para no revelar existencia; decláralo) | Rol insuficiente y **recurso de otro usuario (IDOR/BOLA)** |
| Inexistente | 404 | Id válido pero ausente |
| Conflicto | 409 | Unicidad, estado inválido, stock |
| Campos extra | 400 o ignorados | **Mass assignment**: nunca se persisten `role`, `id`, `pointsBalance`… |
| Paginación y orden | 200 | Defaults, límite máximo, orden estable, lista blanca de `sort` |
| Límites de tamaño | 413/400 | Body grande, strings largos |
| Error inesperado | 500 | Formato uniforme, **sin stack trace ni SQL** en el cuerpo |

### Casos obligatorios de datos
- Constraints con `PRAGMA foreign_keys = ON`: `UNIQUE`, `NOT NULL`, `FOREIGN KEY`, `CHECK`.
- Transacciones: un fallo a mitad de una operación multi-sentencia revierte todo.
- Concurrencia básica si aplica (dos escrituras que compiten por el mismo stock).
- Migraciones: aplican desde cero; son idempotentes o versionadas según el diseño del repo.

Detalle: `references/sqlite-testing.md`, `references/auth-testing.md`, `references/error-handling-testing.md`.

## Fase 1 — Diseño de specs
- Nombre: `debe <comportamiento> cuando <condición>` (en el idioma del repo; aquí, español).
- Arrange-Act-Assert, un motivo de fallo por test, **aislamiento total**: cada test con su propia BD `:memory:` (o una transacción revertida), sin estado compartido, sin `sleep`, reloj con fake timers.
- Factories de datos sintéticos (`makeUser({ ... })`) en lugar de fixtures gigantes; nunca datos reales.
- Orden: dominio → repositorio → servicio → HTTP.
- Plantillas: `assets/spec-http.template.md` y `assets/spec-repository.template.md`.

## Fase 2 — Esqueletos y ejecución RED
1. **Esqueletos mínimos** con la firma pública final:
   - Rutas registradas que responden `501` con el formato de error del repo (`NOT_IMPLEMENTED`). Así el test HTTP falla por aserción de status/cuerpo, no por un 404 de ruta inexistente.
   - Servicios/repositorios cuyos métodos lanzan `new Error('Not implemented')`.
   - Migración nueva vacía o con la tabla mínima, para que el repositorio compile y el test falle por aserción de comportamiento.
   - Tipos/DTOs y esquemas Zod con su forma final (son contrato).
2. **Ejecuta** el typecheck (`npm run typecheck` si es TS) y la suite (`references/runner-setup.md`). Copia la salida real.
3. **Clasifica cada fallo**: ✅ esperado (aserción, `501`, `Not implemented` en el punto ejercitado) o ❌ inválido (compilación, import, tabla inexistente por migración no aplicada, puerto en uso, timeout de setup, o un test que **pasa** sin implementación).
4. Corrige los ❌ (máx. 3 iteraciones) arreglando el test o el esqueleto, nunca debilitando la aserción.
5. Los tests previos siguen en verde.

Si no puedes ejecutar, entrega el comando exacto y **espera la salida real**. No escribas un reporte RED supuesto.

## Salida
1. Specs, esqueletos, factories y migración mínima.
2. `.workflow/<feature>/test-matrix.md`.
3. `.workflow/<feature>/red-report.md` (`assets/red-report.template.md`).
4. `state.md` actualizado (fase 1).

**Criterio de salida**: compila, todos los tests nuevos fallan con ✅, ninguno ❌, los previos en verde, cada requerimiento tiene ≥ 1 test.

## Modos especiales
- **Regresión de seguridad** (desde `express-sec`): test mínimo que reproduce `SEC-<feature>-NN` (p. ej. payload `' OR 1=1 --` en un filtro, acceso de otro usuario a un recurso) y falla con el código actual.
- **Legado sin pruebas**: primero **tests de caracterización** del comportamiento actual (en verde; excepción documentada a RED), después los tests del cambio en rojo. Ver `references/test-design.md` § Legado.
- **Cambio de requerimiento sobre un test existente**: no lo edites; devuélvelo como decisión pendiente (puerta humana).

## Revisión
Antes de entregar, `references/anti-patterns.md` § Checklist.

| Referencia | Cuándo |
|---|---|
| `references/test-design.md` | Siempre |
| `references/http-supertest.md` | Tests de endpoints |
| `references/sqlite-testing.md` | Repositorios, migraciones, transacciones |
| `references/auth-testing.md` | Autenticación, roles, IDOR |
| `references/error-handling-testing.md` | Formato de error, 4xx/5xx, fugas |
| `references/runner-setup.md` | Comandos, Vitest/Jest/node:test |
| `references/anti-patterns.md` | Antes de entregar |
