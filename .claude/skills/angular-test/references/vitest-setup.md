# Runner: Vitest en Angular 21 (y alternativas)

## Detectar el runner
`angular.json` → `projects.<app>.architect.test.builder`:
| Builder | Runner | Comando de una corrida |
|---|---|---|
| `@angular/build:unit-test` | Vitest (por defecto en Angular 21) | `npx ng test --watch=false` |
| `@angular-devkit/build-angular:karma` / `@angular/build:karma` | Karma + Jasmine | `npx ng test --watch=false --browsers=ChromeHeadless` |
| `@angular-builders/jest:run` u otro | Jest | `npx ng test` o `npx jest` según `package.json` |

Ejecuta siempre desde la raíz de la app (donde está `angular.json`). En este repo: `cd frontend`.

## Comandos útiles (Vitest vía `ng test`)
```bash
npx ng test --watch=false                       # suite completa, una vez
npx ng test --watch=false --include='**/cart/**' # filtrar por ruta (verifica la opción con `npx ng test --help`)
npx ng test --watch=false --coverage            # cobertura
```
Las opciones exactas del builder pueden variar entre versiones menores: confírmalas con `npx ng test --help` antes de documentarlas en un reporte.

## Globals y APIs
- El builder expone `describe`, `it`, `expect`, `beforeEach` y `vi` como globals de Vitest (en este repo los specs no los importan).
- Entorno DOM: jsdom (dependencia del proyecto). APIs de navegador no implementadas por jsdom (p. ej. `IntersectionObserver`, `matchMedia`) se stubean en el spec con `vi.stubGlobal`.
- Timers: `vi.useFakeTimers()` / `vi.useRealTimers()`; avanzar con `await vi.advanceTimersByTimeAsync(ms)`.

## Lectura de la salida para el reporte RED
Copia en el reporte, para cada test fallido: archivo, nombre del test, primera línea del error y la aserción (esperado vs recibido). Ejemplo de clasificación:
| Salida | Clasificación |
|---|---|
| `AssertionError: expected [] to have length 2` | ✅ esperado |
| `Error: Not implemented` lanzado desde el método bajo prueba | ✅ esperado |
| `Cannot find module '@features/cart/...'` | ❌ inválido (import) |
| `NG0201: No provider found for CartApi` | ❌ inválido (setup) |
| `TS2339: Property 'add' does not exist` | ❌ inválido (falta esqueleto) |
| Test en verde sin implementación | ❌ inválido (test no discrimina) |

## Karma/Jasmine o Jest
Los principios no cambian. Equivalencias: `vi.fn()` ↔ `jasmine.createSpy()` / `jest.fn()`; `vi.useFakeTimers()` ↔ `jasmine.clock()` / `jest.useFakeTimers()`. En Karma con zone.js, `fakeAsync` sí está disponible, pero en una app zoneless evítalo igualmente para no depender de zone.
