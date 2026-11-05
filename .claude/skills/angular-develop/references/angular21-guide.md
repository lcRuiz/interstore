# Guía Angular 21 moderno

Estabilidad declarada según lo conocido al redactar (nov. 2026). **Antes de usar algo marcado 🧪 o ⚠️, confírmalo en angular.dev** (`https://angular.dev/reference/releases` y la página de la API). Si angular.dev contradice esta tabla, manda angular.dev y actualiza este archivo.

Leyenda: ✅ estable · 🧪 experimental / developer preview · ⚠️ verificar en la versión instalada

## Tabla de contenidos
1. Componentes
2. Reactividad (signals)
3. Datos y HTTP
4. Formularios
5. Router
6. Rendimiento y SSR
7. Accesibilidad
8. TypeScript

## 1. Componentes
| Tema | Recomendación | Estado |
|---|---|---|
| Standalone | Por defecto; no escribas `standalone: true` | ✅ |
| Zoneless | Por defecto en proyectos nuevos de v21 (`provideZonelessChangeDetection` ya no es necesario en ellos) | ✅ |
| Detección de cambios | `ChangeDetectionStrategy.OnPush` siempre | ✅ |
| Inputs | `input()`, `input.required()`, `transform` para normalizar | ✅ |
| Outputs | `output()`; `outputFromObservable()` si la fuente es RxJS | ✅ |
| Two-way | `model()` | ✅ |
| Queries | `viewChild()`, `viewChildren()`, `contentChild()` (signals) | ✅ |
| DI | `inject()` en propiedades de clase | ✅ |
| Host | `host: { '[class.x]': 'cond()', '(click)': 'on()' }` | ✅ |
| Control flow | `@if`, `@for (… ; track …)`, `@switch`, `@let`, `@defer` | ✅ |
| Bindings de clase/estilo | `[class.x]`, `[style.prop]` (no `ngClass`/`ngStyle`) | ✅ |
| Imágenes | `NgOptimizedImage` (`ngSrc`, `width`, `height`, `priority` en el LCP) | ✅ |

## 2. Reactividad
| API | Uso | Estado |
|---|---|---|
| `signal`, `computed` | Estado y derivados | ✅ |
| `effect` | Solo efectos externos (DOM, storage, logs), nunca para derivar estado | ✅ (verifica la semántica de timing en v21) |
| `linkedSignal` | Estado editable que se reinicia cuando cambia una fuente (p. ej. selección que depende de una lista) | ✅ |
| `untracked` | Leer sin crear dependencia | ✅ |
| `toSignal`, `toObservable`, `takeUntilDestroyed` | Puente con RxJS | ✅ |
| `afterRenderEffect`, `afterNextRender` | Trabajo después del render (medir DOM) | ✅ ⚠️ |

Patrón de store: `signal` privado + `computed`/`asReadonly()` públicos + métodos de acción. Ver `frontend/CLAUDE.md` §5.

## 3. Datos y HTTP
| API | Uso | Estado |
|---|---|---|
| `HttpClient` + `provideHttpClient(withFetch(), withInterceptors([...]))` | Base | ✅ |
| Interceptores funcionales (`HttpInterceptorFn`) | Headers, mapeo de errores | ✅ |
| `resource()` / `rxResource()` | Datos asíncronos como signals | 🧪 ⚠️ |
| `httpResource()` | GET reactivo basado en signals | 🧪 ⚠️ |

Si `httpResource` sigue experimental en la versión instalada, prefiere `HttpClient` en un API client + store con signals (estable y fácil de probar). Si se usa, documéntalo como decisión en el doc de la feature.

## 4. Formularios
| API | Uso | Estado |
|---|---|---|
| Reactive Forms tipados (`FormControl<string>`, `nonNullable`) | Formularios de producción | ✅ |
| Signal Forms (`@angular/forms/signals`) | Nuevo modelo basado en signals | 🧪 (experimental en v21; no usar en producción sin decisión explícita) |
| Template-driven | Solo para casos triviales | ✅ |

Una búsqueda simple puede ser un `FormControl` + `valueChanges` con `debounceTime`, o un signal con `toObservable` + `debounceTime`.

## 5. Router
| Tema | Recomendación | Estado |
|---|---|---|
| Lazy loading | `loadComponent` / `loadChildren` por feature | ✅ |
| Inputs desde la ruta | `withComponentInputBinding()` (params y query params como `input()`) | ✅ |
| Guards y resolvers | Funcionales (`CanActivateFn`, `CanMatchFn`, `ResolveFn`) | ✅ |
| Títulos | `title` en la ruta o `TitleStrategy` | ✅ |
| Transiciones | `withViewTransitions()` | ✅ ⚠️ |

## 6. Rendimiento y SSR
- `@defer (on viewport)` para contenido debajo del pliegue; `@placeholder`/`@loading` con las dimensiones finales.
- `track` con ids estables en `@for`.
- `NgOptimizedImage`; `priority` solo en la imagen LCP.
- SSR/hidratación: `provideClientHydration(withEventReplay())`; hidratación incremental (`hydrate on …`) ✅ ⚠️. Este repo no usa SSR: no lo agregues sin decisión.
- Presupuestos del build (`angular.json` → budgets): no los subas para pasar.

## 7. Accesibilidad
- HTML semántico; nada de `div` clickeable.
- Foco visible; gestión del foco en diálogos y en cambios de ruta.
- `aria-live="polite"` para actualizaciones (carrito, puntos, errores de acciones).
- ESLint `templateAccessibility` ya activo en el repo.
- Angular CDK `a11y` (`LiveAnnouncer`, `FocusTrap`) ✅ si hace falta; Angular Aria 🧪 ⚠️.

## 8. TypeScript
- `strict`, `noUncheckedIndexedAccess`, `strictTemplates`.
- Sin `any`; `unknown` + type guards en los bordes (respuestas de la API).
- Uniones discriminadas para estados (`LoadState<T>`).
- `readonly` en datos inmutables; `as const` para catálogos.
