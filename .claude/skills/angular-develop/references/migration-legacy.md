# Migración de código legado a Angular 21

Objetivo: modernizar sin cambiar comportamiento, con red de seguridad de tests.

## Orden recomendado
1. **Caracterización** (`angular-test`): tests que fijan el comportamiento actual del área a tocar. Deben pasar antes de migrar.
2. **Actualizar versión** si hace falta, de una versión mayor a la vez: `npx ng update @angular/core@<N> @angular/cli@<N>`. Lee la guía en `https://angular.dev/update-guide`.
3. **Schematics oficiales**, uno por commit, con tests en verde antes y después:
   | Paso | Schematic | Resultado |
   |---|---|---|
   | Standalone | `@angular/core:standalone` | Elimina NgModules |
   | Control flow | `@angular/core:control-flow` | `*ngIf/*ngFor` → `@if/@for` |
   | DI | `@angular/core:inject` | Constructor → `inject()` |
   | Inputs | `@angular/core:signal-input-migration` | `@Input` → `input()` |
   | Outputs | `@angular/core:output-migration` | `@Output` → `output()` |
   | Queries | `@angular/core:signal-queries-migration` | `@ViewChild` → `viewChild()` |
   Verifica los nombres disponibles con `npx ng generate @angular/core: --help`.
4. **Manual**:
   - Estado con `BehaviorSubject` → `signal`/`computed`.
   - `ngClass/ngStyle` → bindings de clase y estilo.
   - `@HostBinding/@HostListener` → `host: {}`.
   - Default → OnPush (requiere que todo el estado relevante sea signal u observable con `async`/`toSignal`).
5. **Zoneless** (último): quitar `zone.js` de `polyfills` y usar `provideZonelessChangeDetection()` si la versión lo necesita explícitamente. Antes, busca dependencias implícitas de zone: `setTimeout` que actualiza estado sin signals, librerías que dependen de `NgZone`.
6. **Tests**: `fakeAsync`/`tick` → timers de Vitest. Si el proyecto migra de Karma a Vitest, hazlo en un PR aparte.

## Reglas
- Una migración por commit (`refactor(<scope>): migrate … to …`) para que sea fácil de revisar y revertir.
- No mezcles migración con cambios de comportamiento en el mismo commit ni en el mismo PR, salvo que el usuario lo pida.
- Si un schematic deja `TODO`s, resuélvelos o regístralos como `TODO(<feature>):`.
