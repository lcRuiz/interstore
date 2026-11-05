---
name: angular-test
description: Diseña y escribe las pruebas unitarias ANTES de implementar (fase RED de TDD) en proyectos Angular 21 — matriz requerimiento→casos de prueba, specs con Vitest/TestBed para componentes standalone y zoneless, servicios HTTP, stores con signals, guards, resolvers, interceptores funcionales y pipes, más esqueletos mínimos que compilan y un reporte RED que demuestra que cada test falla por la razón correcta. Úsala siempre que haya que escribir o diseñar tests de Angular, empezar una feature con TDD, cubrir código legado sin pruebas, o crear un test de regresión para un bug o hallazgo de seguridad, aunque el usuario solo diga "agrega tests" o "primero las pruebas". No implementa la lógica de producción (eso es angular-develop).
---

# angular-test — fase RED

Tu trabajo es convertir un requerimiento en **pruebas ejecutables que fallan por la razón correcta**. Un test que falla por un import roto o un error de compilación no prueba nada: solo demuestra que el entorno está mal. El entregable es la evidencia de que, cuando la implementación exista, estos tests distinguirán lo correcto de lo incorrecto.

Contratos y estado: `.claude/workflow/handoff-contracts.md` y `.workflow/<feature>/state.md` (si existe; si corres sin orquestador, créalo con `.claude/workflow/state-template.md`).

## Entrada esperada
Requerimiento, supuestos, raíz de la app, runner y convenciones del repo (`CLAUDE.md`). Si falta el runner, detéctalo en `angular.json` (`architect.test.builder`). Si falta algo crítico para el contrato (forma de un DTO, una regla de negocio), pregúntalo antes de escribir tests: un test sobre un contrato inventado obliga a reescribirlo después.

## Fase 0 — Análisis y matriz

Extrae del contexto, sin implementar nada:
1. **Requerimientos funcionales** (R1, R2…) y **reglas de negocio** (RN1…).
2. **Contratos**: DTOs, endpoints (método, ruta, query, body), códigos y formato de error. Tómalos del backend o de la documentación real; si no existen, decláralos como supuesto.
3. **Estados de UI**: carga, vacío, error (y si es reintentable), éxito; estados intermedios (deshabilitado mientras hay una acción en curso).
4. **Casos borde**: listas vacías, paginación en límites, valores nulos, errores de red (status 0), 4xx con cuerpo de error, 5xx, respuestas lentas o fuera de orden, doble clic, permisos.
5. **Matriz requerimiento → casos**: usa `assets/test-matrix.template.md` y guárdala en `.workflow/<feature>/test-matrix.md`. Cada requerimiento tiene al menos un caso; cada caso apunta a un requerimiento. Un caso sin requerimiento es ruido; un requerimiento sin caso es un hueco.

Prioriza por riesgo: lógica de negocio y contratos primero, UI después. Si el tiempo es limitado, recorta casos de UI cosmética, nunca de reglas de negocio ni de errores.

## Fase 1 — Diseño de specs por capa

Lee solo la referencia de la capa que vas a probar:

| Capa | Referencia |
|---|---|
| Principios, nombres, AAA, dobles de prueba | `references/test-design.md` (léela siempre) |
| Componentes standalone/zoneless, inputs/outputs, DOM | `references/components.md` |
| Servicios HTTP, API clients, mapeo de errores | `references/services-http.md` |
| Guards, resolvers, interceptores funcionales | `references/guards-interceptors.md` |
| Stores con signals, `computed`, `effect`, optimismo | `references/signals-zoneless.md` |
| Configuración del runner, comandos, Karma/Jest | `references/vitest-setup.md` |
| Errores comunes y cómo evitarlos | `references/anti-patterns.md` |

Reglas de diseño (el porqué está en `test-design.md`):
- Nombre: `debe <comportamiento> cuando <condición>` (en el idioma del repo; en este repo, español).
- Estructura Arrange-Act-Assert, un motivo de fallo por test, sin estado compartido entre tests.
- Prueba **comportamiento observable** (DOM, valores emitidos, peticiones HTTP, estado público del store), no detalles internos (métodos privados, cantidad de llamadas a funciones internas).
- Mocks mínimos: `HttpTestingController` para HTTP, dobles simples para dependencias de otras features. No mockees lo que estás probando.
- Orden de escritura: dominio (store/servicio) → interacción (componente contenedor) → presentación (componente `ui`).

Plantillas de spec por tipo: `assets/spec-templates.md`.

## Fase 2 — Esqueletos y ejecución RED

1. **Esqueletos mínimos** para que el spec compile:
   - Clases, métodos y signals con la firma pública final y el cuerpo mínimo: `throw new Error('Not implemented')` o un valor neutro (`signal([])`, `of([])`) cuando lanzar haría fallar por una razón distinta de la aserción.
   - Componentes con selector, `input()`/`output()` declarados y template vacío o mínimo.
   - Sin lógica: si un esqueleto hace pasar un test, el test no estaba probando nada o el esqueleto implementó de más.
   - Respeta las convenciones de nombres y carpetas del repo (en este repo: `frontend/CLAUDE.md` §2–§3).
2. **Ejecuta** la suite con el runner real (comando en `references/vitest-setup.md`). No resumas de memoria: copia la salida relevante.
3. **Clasifica cada fallo**:
   - ✅ **Esperado**: falla una aserción sobre el comportamiento pendiente, o lanza `Not implemented` en el punto exacto que el test ejercita.
   - ❌ **Inválido**: error de compilación, import, provider faltante, `NG0xxx` de configuración, timeout por un mal setup, o un test que **pasa** sin implementación.
4. **Corrige los inválidos** (máx. 3 iteraciones) y vuelve a ejecutar. Corregir significa arreglar el test o el esqueleto, nunca debilitar la aserción.
5. Los tests que ya existían en el repo deben seguir en verde. Si uno se rompe por tus esqueletos, tu esqueleto cambió un contrato existente: revísalo.

Si no puedes ejecutar el runner (sin Node, sin permisos), entrega el comando exacto y **espera la salida real** del usuario. No escribas un reporte RED supuesto.

## Salida

1. Specs y esqueletos en sus rutas finales.
2. `.workflow/<feature>/test-matrix.md`.
3. `.workflow/<feature>/red-report.md` con `assets/red-report.template.md`: total, fallidos, pasados, motivo de cada fallo con su clasificación y el comando ejecutado.
4. Actualización de `state.md` (fase 1, iteraciones, evidencia).

**Criterio de salida**: compila, todos los tests nuevos fallan con ✅, ninguno ❌, los tests previos siguen en verde y cada requerimiento de la matriz tiene al menos un caso.

## Modos especiales

- **Test de regresión de seguridad** (invocado desde `angular-sec`): un solo test (o muy pocos) que reproduce el hallazgo `SEC-<feature>-NN` y falla con el código actual. Nómbralo con el ID en el `describe` o en un comentario, para que quede trazable.
- **Código legado sin pruebas**: primero **tests de caracterización** que fijan el comportamiento actual (deben pasar en verde, se documenta como excepción a RED), después los tests del cambio pedido (en rojo). Detalle en `references/test-design.md` § Legado.
- **Cambio de requerimiento sobre un test existente**: no lo edites. Repórtalo al orquestador o al usuario como decisión pendiente (requiere puerta humana).

## Checklist de revisión de pruebas
Antes de entregar, revisa `references/anti-patterns.md` § Checklist. Si un ítem falla, corrígelo o justifícalo en el reporte RED.
