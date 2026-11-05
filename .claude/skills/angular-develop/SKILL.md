---
name: angular-develop
description: Implementa funcionalidades Angular 21 en modo TDD (fase GREEN) — escribe el código mínimo para pasar los tests existentes, refactoriza y documenta lo implementado, con Angular moderno (standalone, zoneless, OnPush, signals, input()/output()/model(), inject(), @if/@for/@defer, formularios tipados, rutas lazy, interceptores y guards funcionales, accesibilidad y TypeScript strict) y aplicando las reglas de codificación segura registradas por angular-sec. Úsala siempre que haya que escribir o refactorizar código de producción Angular (componentes, servicios, stores, guards, interceptores), pasar tests de rojo a verde, migrar código legado a Angular 21 o generar la documentación de una feature, aunque el usuario solo diga "impleméntalo" o "haz que pasen los tests". No diseña los tests (angular-test), no audita seguridad (angular-sec) ni hace commits o PRs (angular-git).
---

# angular-develop — fase GREEN + refactor + documentación

Implementas contra los tests que dejó `angular-test`. Los tests son la especificación: tu trabajo es hacerlos pasar con el diseño más simple que respete las convenciones del repo, después mejorar ese diseño sin romperlos y, por último, documentar lo que **realmente** construiste.

Contratos y estado: `.claude/workflow/handoff-contracts.md`, `.workflow/<feature>/state.md`.

## Antes de escribir código (siempre)

1. **Lee `references/security-rules.md`.** Son reglas aprendidas en auditorías anteriores; aplicarlas desde el diseño es más barato que corregirlas después en `angular-sec`.
2. Lee las convenciones del repo (`CLAUDE.md`, en este repo `frontend/CLAUDE.md`): arquitectura, nombres, estado, estilos y documentación. Mandan sobre esta skill.
3. Lee la matriz y el reporte RED (`.workflow/<feature>/`). Si no existen o tienen fallos ❌ inválidos, **detente**: implementar sin RED válido rompe TDD.
4. Si tienes dudas sobre una API de Angular 21, consulta `references/angular21-guide.md` y, si no está ahí o está marcada como experimental, angular.dev. No inventes APIs ni opciones.

## Ciclo GREEN

Avanza de dominio a UI: tipos/contrato → API client → store → componentes `ui` → página → rutas.

Por cada bloque:
1. Implementa lo mínimo para pasar los tests de ese bloque.
2. Ejecuta la suite (`cd frontend && npx ng test --watch=false`, o filtrada mientras iteras; la corrida completa al cerrar).
3. Si un test sigue en rojo, el problema está en tu código. Revisa el mensaje y el contrato, no el test.

### Regla de oro sobre los tests
**Prohibido modificar, eliminar, saltar (`skip`/`only`) o relajar un test para que pase.** Un test solo cambia si:
- **Error demostrable del test** (contradice el requerimiento o el contrato real): explica la evidencia, corrígelo y regístralo en el reporte GREEN.
- **Cambio de requerimiento**: no lo toques. Devuelve una decisión pendiente al orquestador (requiere puerta humana) y espera.

Si después de 3 iteraciones un test no pasa y no es un error del test, escala con la evidencia (qué probaste, qué falla, hipótesis).

## Refactor (con todo en verde)

Mejora nombres, extrae funciones, elimina duplicación y simplifica el estado, ejecutando la suite después de cada cambio. Revisa contra:
- `references/anti-patterns.md`: antipatrón → alternativa moderna.
- `references/pr-checklist.md`: lo que revisará `angular-git`.

El refactor no agrega comportamiento: si quieres algo nuevo, eso necesita un test primero (vuelve a `angular-test`).

## Calidad antes de cerrar

Ejecuta y deja en verde (comandos del repo):
```bash
cd frontend
npx ng test --watch=false
npm run lint
npm run format:check
npm run build
```
No desactives reglas de lint para pasar. Si una regla no encaja, sigue la política del repo (en este repo, `frontend/CLAUDE.md` §13).

## Documentación (después de GREEN y refactor)

Documenta lo que existe, no lo que se planeó. Guía completa: `references/documentation.md`.
1. **TSDoc** en la API pública: componentes, `input()`/`output()`/`model()`, métodos públicos de stores y APIs, tipos del contrato. Explica el para qué y el porqué, sin repetir tipos.
2. **`docs/features/<feature>.md`** con `assets/feature-doc.template.md`: propósito, decisiones de diseño, estructura de archivos, API pública, flujos, supuestos y cómo probar.
3. Si una decisión tuvo alternativas reales, agrégala al README raíz (Contexto → Decisión → Consecuencias), según las convenciones del repo.

## Salida

1. Implementación en la rama de la feature.
2. `.workflow/<feature>/green-report.md` con `assets/green-report.template.md`: total, pasados, cobertura si hay, lint/build, lista de archivos modificados y **cambios a tests justificados (idealmente vacía)**.
3. `docs/features/<feature>.md` y TSDoc.
4. `state.md` actualizado (fase 2).

**Criterio de salida**: 100 % de la suite en verde (no solo los tests nuevos), lint/format/build ok, sin tests alterados sin justificación, documentación creada.

## Modo remediación (invocado desde `angular-sec` o una revisión de PR)

- Recibes un hallazgo (`SEC-<feature>-NN`) o un comentario de revisión con su test de regresión ya en rojo.
- Arregla la causa raíz con el cambio mínimo, pasa el test y la suite completa, y anota el fix en el reporte GREEN (sección Remediaciones).
- Si el fix cambia la API pública, actualiza `docs/features/<feature>.md`.

## Migración de legado
Si el código usa NgModules, decoradores `@Input/@Output`, `*ngIf/*ngFor`, constructor DI o zone.js, sigue `references/migration-legacy.md`: primero tests de caracterización (los pone `angular-test`), después los schematics oficiales y, por último, el ajuste manual.

## Referencias
| Archivo | Cuándo leerlo |
|---|---|
| `references/security-rules.md` | **Siempre**, antes de implementar |
| `references/angular21-guide.md` | Al decidir qué API usar (incluye su nivel de estabilidad) |
| `references/anti-patterns.md` | En el refactor y ante dudas de diseño |
| `references/pr-checklist.md` | Antes de cerrar la fase |
| `references/documentation.md` | Al documentar |
| `references/migration-legacy.md` | Con código legado |
