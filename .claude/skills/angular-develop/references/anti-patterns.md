# Antipatrón → alternativa moderna (Angular 21)

| Antipatrón | Alternativa | Por qué |
|---|---|---|
| `@Input()` / `@Output()` | `input()`, `input.required()`, `output()`, `model()` | Reactividad con signals, tipado estricto, menos boilerplate |
| `@ViewChild` | `viewChild()` / `viewChild.required()` | Signals, sin `ngAfterViewInit` para leerlos |
| `constructor(private x: X)` | `private readonly x = inject(X)` | Funciona en funciones (guards, interceptores) y con herencia |
| `@HostBinding` / `@HostListener` | `host: {}` en el decorador | Declarativo y verificado por el compilador |
| `*ngIf`, `*ngFor`, `ngSwitch` | `@if`, `@for (…; track id)`, `@switch` | Sin imports, mejor rendimiento, `@empty` |
| `[ngClass]`, `[ngStyle]` | `[class.x]`, `[style.prop]` | Más simple y rápido |
| NgModules por feature | Componentes standalone + rutas lazy | Menos indirección |
| `ChangeDetectionStrategy.Default` | `OnPush` | Necesario para zoneless y para el rendimiento |
| `BehaviorSubject` como estado del componente | `signal` + `computed` | Sin suscripciones manuales |
| `subscribe` en el componente sin cleanup | `toSignal`, `takeUntilDestroyed()` | Evita fugas de memoria |
| `effect` que escribe otro signal derivado | `computed` o `linkedSignal` | Evita ciclos y estados intermedios |
| Lógica en el template (`{{ calc(x) }}`) | `computed` | Se memoiza; el template queda declarativo |
| Filtrar o paginar en el cliente datos paginados por el servidor | Pasar los filtros a la API | Contrato y rendimiento correctos |
| Calcular precios o puntos en el cliente | Mostrar lo que devuelve el servidor | El servidor es la fuente de verdad (regla de negocio) |
| `HttpErrorResponse` filtrándose a la UI | Interceptor → `ApiError` de dominio | La UI decide por `code` |
| `any` en respuestas HTTP | Tipos del contrato + type guards | Errores en compilación, no en producción |
| `setTimeout` para "esperar" el render | `afterNextRender` / `whenStable` | Determinista |
| `fakeAsync` en tests de una app zoneless | Timers de Vitest | zone.js no está cargado |
| `innerHTML` con datos del usuario / `bypassSecurityTrust*` | Interpolación o binding sanitizado (ver `security-rules.md`) | XSS |
| Token en `localStorage` | Cookie `HttpOnly` gestionada por el backend | Robo de sesión vía XSS |
| Hex/px sueltos en SCSS | Tokens CSS (`var(--space-4)`) | Consistencia y modo oscuro |
| Importar internals de otra feature | Su store público en `data-access` | Límites de arquitectura |

## Migración rápida con schematics oficiales
```bash
npx ng generate @angular/core:signal-input-migration
npx ng generate @angular/core:output-migration
npx ng generate @angular/core:signal-queries-migration
npx ng generate @angular/core:inject
npx ng generate @angular/core:control-flow
npx ng generate @angular/core:standalone
```
Ejecútalos de a uno, con tests en verde antes y después, y un commit por migración. Verifica los nombres exactos con `npx ng generate @angular/core: --help` en la versión instalada.
