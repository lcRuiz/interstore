# Frontend — Reglas de desarrollo

Guía obligatoria para cualquier cambio en `frontend/`. Si una regla no aplica a un caso, documenta la excepción en el código (comentario breve con el porqué) en lugar de ignorarla.

Contexto: mini e-commerce con gamificación (prueba técnica). El backend vive en `../backend` (Express + SQLite). Se valora **alcance acotado bien resuelto**, criterio de ingeniería y supuestos documentados.

---

## 1. Stack y versiones

| Pieza | Versión / decisión |
|---|---|
| Angular | **21.x** — standalone, **zoneless** (sin `zone.js`), signals |
| TypeScript | 5.9, `strict`, `strictTemplates`, `noUncheckedIndexedAccess` |
| Estilos | **SCSS + tokens CSS** del sistema de diseño NORTE (sin Tailwind ni Angular Material) |
| Íconos | `lucide-angular` envuelto en `<app-icon>` (`shared/ui/icon`) |
| Fuentes | Geist / Geist Mono vía `@fontsource-variable/*` (sin CDN) |
| Tests | Vitest (`@angular/build:unit-test`) + jsdom |
| Calidad | ESLint 10 (angular-eslint 21, typescript-eslint con tipos, eslint-plugin-jsdoc) + Prettier |
| Node | ≥ 22.13 (probado con 24.x) |

No agregar dependencias sin justificarlo en el commit. Antes de instalar algo, verifica si Angular ya lo resuelve.

### Comandos

```bash
npm start                 # ng serve en http://localhost:4200 (proxy /api → :3000)
npm test                  # Vitest en modo watch
npx ng test --watch=false # una sola corrida (CI / verificación)
npm run build             # build de producción
npm run lint              # ESLint (TS + templates)
npm run lint:fix          # ESLint con autocorrección
npm run format            # Prettier sobre src/
npm run format:check      # verifica formato sin escribir
```

El backend debe estar corriendo (`cd ../backend && npm run dev`) para que la app tenga datos.

---

## 2. Arquitectura

Organización **por feature** con tres zonas:

```
src/app/
├── core/        Singletons de la app. Se usan, no se extienden.
│   ├── api/       contrato con el backend: tipos, ApiError, interceptor de errores
│   ├── session/   usuario actual (X-User-Id) + interceptor
│   └── layout/    shell (header + router-outlet)
├── shared/      Piezas reutilizables y SIN conocimiento del dominio.
│   ├── ui/        componentes presentacionales genéricos (icon, button, spinner, empty-state, error-state…)
│   └── utils/     funciones y tipos puros (load-state…)
└── features/    Una carpeta por capacidad de negocio.
    ├── catalog/   listado, filtros, búsqueda, paginación
    ├── cart/      carrito optimista
    └── rewards/   saldo de puntos y feedback de recompensas
```

Dentro de cada feature:

```
features/<feature>/
├── data-access/   <feature>-api.ts (HTTP) y <feature>-store.ts (estado con signals)
├── ui/            componentes presentacionales: solo input()/output(), sin inyectar servicios de datos
└── pages/         componentes enrutados (contenedores): conectan store ↔ ui
```

### Reglas de dependencia

- `features/*` puede importar de `core` y `shared`.
- `shared` **no** importa de `features` ni de `core/layout`. Solo puede usar tipos de `core/api`.
- Una feature **no** importa archivos internos de otra. Si `cart` necesita notificar puntos a `rewards`, lo hace a través del **store público** de `rewards` (`features/rewards/data-access/rewards-store.ts`), nunca de sus componentes.
- `core` se provee una vez (`providedIn: 'root'` o `app.config.ts`).
- Usar los alias `@core/*`, `@shared/*`, `@features/*`; nada de `../../../`.
- Cada feature se carga lazy desde `app.routes.ts` (`loadComponent` o `loadChildren`).

---

## 3. Creación de directorios y archivos

- **kebab-case** para carpetas y archivos.
- **Style guide v20+ (sin sufijos de tipo)**: `product-card.ts`, `catalog-page.ts`, `cart-store.ts`, `catalog-api.ts`. No usar `.component.ts` / `.service.ts`. Clases: `ProductCard`, `CatalogPage`, `CartStore`, `CatalogApi`.
- Excepciones con sufijo por claridad: `*.interceptor.ts`, `*.guard.ts`, `*.types.ts`, `*.spec.ts`.
- **Una carpeta por componente**, con su template y estilos al lado:
  ```
  ui/product-card/
  ├── product-card.ts
  ├── product-card.html   (si el template supera ~15 líneas; si no, inline)
  ├── product-card.scss   (ídem)
  └── product-card.spec.ts
  ```
- Generar con el CLI (ya configurado con SCSS + OnPush):
  ```bash
  npx ng g c features/catalog/ui/product-card
  npx ng g c features/catalog/pages/catalog-page
  npx ng g s features/catalog/data-access/catalog-store
  ```
- Prefijo de selector: `app-`.
- No crear carpetas vacías "por si acaso": se crean cuando llega el primer archivo.
- Tests (`*.spec.ts`) junto al archivo que prueban.

---

## 4. Reglas de componentes

- `changeDetection: ChangeDetectionStrategy.OnPush` **siempre** (obligatorio en zoneless).
- Standalone por defecto: **no** escribir `standalone: true`.
- APIs basadas en funciones: `input()`, `input.required()`, `output()`, `model()`, `viewChild()`, `inject()`. Prohibido `@Input`, `@Output`, `@ViewChild` y DI por constructor.
- Control flow nativo: `@if`, `@for (x of xs; track x.id)`, `@switch`, `@let`. Prohibido `*ngIf` / `*ngFor`.
- `host: { ... }` en el decorador en lugar de `@HostBinding` / `@HostListener`.
- `[class.activo]="..."` y `[style.x]` en lugar de `ngClass` / `ngStyle`.
- `NgOptimizedImage` (`ngSrc` + `width`/`height`) para imágenes de producto.
- Templates sin lógica: solo leen signals/`computed` y llaman métodos. Nada de llamadas a funciones costosas ni pipes impuros.
- Miembros usados solo por el template: `protected`. Inputs/outputs y API pública: `readonly`.
- Componentes `ui/` no inyectan stores ni `HttpClient`: reciben datos y emiten eventos.

---

## 5. Estado y datos

- **Signals como fuente de verdad.** Patrón de store por feature:
  ```ts
  @Injectable({ providedIn: 'root' })
  export class CartStore {
    private readonly api = inject(CartApi);
    private readonly state = signal<CartState>(initialState);   // privado y mutable
    readonly items = computed(() => this.state().items);         // público y de solo lectura
    readonly total = computed(() => this.state().total);
    add(productId: number): void { /* acción */ }
  }
  ```
- Derivar con `computed`. **`effect` solo para efectos hacia fuera** (localStorage, logs, foco); nunca para copiar un signal en otro.
- RxJS solo en los bordes: HTTP y flujos con tiempo (búsqueda con `debounceTime(300)` + `distinctUntilChanged` + `switchMap`). Pasar a signals con `toSignal` o suscribirse en el store con `takeUntilDestroyed`.
- Los filtros del catálogo (categoría, búsqueda, página) se reflejan en **query params**, para que los enlaces se puedan compartir y el botón atrás funcione. Leerlos con `withComponentInputBinding()` (ya activo).
- Paginación, filtro y búsqueda **los resuelve el servidor**. Prohibido filtrar o paginar la lista en el cliente.

---

## 6. Contrato con el backend

- Tipos espejo en `core/api/api.types.ts` (`ApiResponse<T>`, `Paginated<T>`, `ApiErrorBody`). Los tipos de cada recurso viven en `features/<f>/data-access/<f>.types.ts`.
- Rutas siempre relativas con `API_BASE_URL` (`/api`). En dev, `proxy.conf.json` las envía a `http://localhost:3000`. No hardcodear hosts.
- `X-User-Id` lo agrega `userIdInterceptor`; las features nunca lo ponen a mano. El usuario actual lo maneja `Session` (`core/session`).
- Todos los errores HTTP llegan como `ApiError { status, code, message, details, retryable }` (`apiErrorInterceptor`). La UI decide qué mostrar según `code`, no según `message`.
- **El cliente nunca calcula puntos ni precios finales.** Muestra lo que devuelve el servidor (p. ej. `rewards.awarded`, `rewards.balance`, `total`). El total del carrito que se muestra de forma optimista es provisional y se reemplaza por el del servidor.
- Las clases `*-api.ts` solo hacen HTTP y mapean tipos; nada de estado ni lógica de UI.

---

## 7. Actualización optimista (carrito)

Patrón obligatorio para mutaciones del carrito (agregar, cambiar cantidad, quitar):

1. Guardar un **snapshot** del estado actual.
2. **Aplicar** el cambio en el signal de inmediato.
3. Llamar a la API.
4. **Éxito:** reconciliar con la respuesta del servidor (fuente de verdad) y actualizar los puntos con lo que reporte.
5. **Error:** **rollback** al snapshot y mostrar un aviso con `ApiError.message` (p. ej. `OUT_OF_STOCK`).

- Serializar las operaciones sobre un mismo producto (`concatMap`, o una cola por `productId`) para evitar carreras con clics rápidos.
- Los puntos **no** se actualizan de forma optimista: solo cambian cuando responde el servidor.
- Cada store optimista tiene tests del camino feliz **y** del rollback.

---

## 8. Estados de UI

Toda vista con datos remotos modela `LoadState<T>` (`shared/utils/load-state.ts`) y renderiza explícitamente los cuatro casos:

```html
@switch (state().status) {
  @case ('loading') { <app-product-grid-skeleton /> }
  @case ('error')   { <app-error-state [error]="state().error" (retry)="reload()" /> }
  @case ('empty')   { <app-empty-state message="No hay productos para este filtro" /> }
  @case ('success') { <app-product-grid [products]="state().data" /> }
}
```

- Carga: skeletons con las dimensiones del contenido final (sin saltos de layout). Un spinner solo para acciones puntuales.
- Error: mensaje entendible y, si `error.retryable`, botón "Reintentar".
- Vacío: mensaje contextual y, si aplica, una acción (p. ej. "Limpiar filtros").
- Las acciones (agregar al carrito, favorito) deshabilitan su control mientras están en curso, sin bloquear el resto de la página.

---

## 9. Estilos

- **Solo tokens** de `src/styles/_tokens.scss`: `var(--space-4)`, `var(--text)`, `var(--radius-md)`, `font: var(--text-h3)`. Prohibido usar colores hex o px sueltos para color, espaciado, radio o tipografía. Bordes de 1px y tamaños de íconos son la excepción.
- Usar los **semánticos** (`--bg`, `--surface`, `--text-muted`, `--accent`, `--error`…), no las escalas (`--neutral-300`). Así el modo oscuro funciona solo.
- Tipografía: `font: var(--text-<nivel>); letter-spacing: var(--tracking-<nivel>);` con niveles `display, h1–h4, body-l, body-m, body-s, caption, overline`.
- **Mobile-first** con los mixins: `@use 'breakpoints' as bp;` → `@include bp.up(md) { … }` (sm 360, md 768, lg 1024, xl 1440). El include path ya apunta a `src/styles`.
- Layout de página con `.container` (máx. 1280px + margen de grilla).
- Modo oscuro: `<html data-theme="dark">`. No usar `prefers-color-scheme` directamente en componentes.
- Animaciones con `var(--duration-*)` y `var(--ease-out)`; se anulan solas con `prefers-reduced-motion`.
- Estilos encapsulados por componente (`:host`). Globales solo en `src/styles/` (reset, base, utilidades mínimas).
- Presupuesto: ≤ 4 kB de SCSS por componente (advertencia del build). Si se supera, dividir el componente.
- **Referencia visual:** `../design/project/` (`Store.dc.html`, `Design System.dc.html`, `ProductCard.dc.html`). Está en `.gitignore` y solo existe en local: lo que se tome de ahí (tokens, medidas) se transcribe al código.

---

## 10. Accesibilidad (WCAG 2.1 AA)

- HTML semántico primero (`button`, `nav`, `main`, `h1…`, `ul/li`); `div` clickeable prohibido.
- Íconos siempre decorativos (`<app-icon>` ya pone `aria-hidden`). Los botones que solo tienen ícono llevan `aria-label`.
- Foco visible (global con `--focus-ring`); nunca `outline: none` sin reemplazo.
- Anunciar cambios dinámicos con `aria-live="polite"`: saldo de puntos, cantidad del carrito y errores de acciones.
- Inputs con `<label>` asociado (la búsqueda puede usar `.visually-hidden`).
- Contraste: los pares semánticos del diseño ya cumplen AA; no inventar combinaciones nuevas.
- Todo se puede operar con teclado.

---

## 11. Testing

- Vitest + `TestBed`. HTTP con `provideHttpClient()` + `provideHttpClientTesting()` y `HttpTestingController`.
- Prioridad (en este orden):
  1. Stores: optimista + rollback, reconciliación con el servidor, puntos.
  2. Interceptores y mapeo de errores (ya cubiertos en `core`).
  3. Páginas: que renderizan cada `LoadState`.
  4. Componentes `ui` con lógica (no hace falta testear los puramente visuales).
- Nombres de tests en español y descriptivos del comportamiento.
- Antes de cada commit: lint, formato, tests y build en verde (ver §13).

---

## 12. Documentación del código

Principio: **el código dice qué hace; la documentación dice para qué sirve, cómo se usa y por qué es así.** Se documenta la API pública y las decisiones, no lo obvio. TypeScript ya aporta los tipos, así que la documentación nunca los repite.

### 12.1 Formato: TSDoc

- Bloques `/** … */` inmediatamente encima de la declaración. Son los que leen el IDE, el Angular Language Service y herramientas como Compodoc.
- La primera oración es un **resumen de una línea** en tercera persona o en infinitivo ("Agrega…", "Estado del carrito…"). Después, si hace falta, una línea en blanco y el detalle.
- Etiquetas permitidas: `@param`, `@returns`, `@throws`, `@example`, `@see`, `@deprecated`, `@remarks`.
- **Sin tipos en las etiquetas** (`@param productId Id del producto`, no `@param {number} productId`).
- `@param` y `@returns` solo cuando aportan algo que el nombre y el tipo no dicen (unidades, rangos, efectos, qué significa `undefined`).
- Para `@example`, un bloque de código corto y que compile.
- Comentarios de línea `//` solo **dentro** de funciones, para explicar un *porqué* no evidente. Nunca para narrar el código.

### 12.2 Qué se documenta (obligatorio)

| Elemento | Qué debe decir |
|---|---|
| **Componente** (`@Component`) | Resumen de su responsabilidad. En `shared/ui`, además un `@example` de uso con su selector. |
| **`input()` / `model()`** | Qué representa, valor por defecto si no es obvio y restricciones (p. ej. "precio en COP, entero"). |
| **`output()`** | Cuándo se emite y qué payload lleva. |
| **Store** (`*-store.ts`) | Qué estado gestiona, quién es la fuente de verdad y, en cada acción pública, sus efectos (HTTP, optimista, puntos). |
| **API** (`*-api.ts`) | Cada método: endpoint (`GET /api/products`), qué devuelve y los códigos de `ApiError` que puede producir (`@throws`). |
| **Tipos del contrato** (`*.types.ts`) | Qué endpoint los usa; documentar los campos con unidades o semántica no obvia. |
| **Interceptores, guards y providers** | Qué peticiones o rutas afectan y su orden relativo si importa. |
| **Utilidades de `shared/utils`** | Contrato completo: entradas, salida y casos borde. |
| **Constantes y tokens de DI** | Para qué existen y quién los consume. |

**No se documenta:** miembros `private`/`protected` triviales, getters o `computed` cuyo nombre lo dice todo, constructores, ni implementaciones de ciclo de vida (`ngOnInit`) salvo que hagan algo no evidente.

### 12.3 Marcadores estandarizados

Usar siempre estos prefijos, en mayúsculas, para que se puedan buscar con grep:

- `SUPUESTO:` una decisión tomada por falta de requisito. También se lista en el README raíz.
- `RECORTE:` algo que se dejó fuera conscientemente por tiempo, y qué haría falta.
- `NOTA:` una restricción técnica no obvia (p. ej. "en Express 5 `req.query` es de solo lectura").
- `TODO(<feature>):` trabajo pendiente concreto, con el scope de la feature. Prohibido un `TODO` sin scope ni acción.
- `@deprecated` (TSDoc) con la alternativa: `@deprecated Usar CartStore.update() en su lugar.`

Prohibido dejar código comentado: para eso está git.

### 12.4 Templates y estilos

- HTML: comentarios `<!-- -->` solo para marcar **puntos de extensión** o decisiones de accesibilidad no evidentes (p. ej. por qué un `aria-live` es `polite`). No describir el markup.
- SCSS: documentar con `//` toda **excepción** a las reglas de estilos (un px suelto, un `z-index`, un `!important`) con el motivo. Los parciales de `src/styles/` llevan un encabezado que explica qué contienen y cómo se usan.

### 12.5 Idioma y tono

- Documentación y comentarios en **español**; identificadores en inglés.
- Frases cortas, en presente y sin relleno ("Este método se encarga de…" → "Agrega…").
- Nombres de código entre comillas invertidas: `CartStore`, `X-User-Id`, `OUT_OF_STOCK`.

### 12.6 Documentación fuera del código

- **`README.md` raíz:** cómo ejecutar todo, decisiones de arquitectura, reglas de puntos, supuestos y recortes. Es parte de la evaluación: se actualiza en el mismo commit que introduce la decisión.
- **`frontend/README.md`:** solo puesta en marcha y estructura. Las reglas viven aquí, en `CLAUDE.md`.
- **Decisiones de arquitectura:** cuando una decisión tenga alternativas reales (p. ej. signals vs NgRx, offset vs cursor), agregar una entrada breve en la sección "Decisiones" del README raíz con el formato *Contexto → Decisión → Consecuencias*.
- Si un cambio de código vuelve falsa una regla de este archivo, se actualiza `CLAUDE.md` en el mismo commit.

### 12.7 Ejemplo de referencia

```ts
/**
 * Estado del carrito del usuario actual con actualización optimista.
 *
 * El servidor es la fuente de verdad: cada respuesta reemplaza el estado local
 * y es la única que actualiza los puntos.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  /**
   * Agrega una unidad del producto al carrito.
   *
   * Aplica el cambio de inmediato y lo revierte si la API falla.
   * Si el servidor otorga puntos, los propaga a `RewardsStore`.
   *
   * @param productId Id del producto en el catálogo.
   */
  add(productId: number): void { /* … */ }
}

/**
 * Tarjeta de producto del catálogo.
 *
 * @example
 * <app-product-card [product]="p" [busy]="adding()" (addToCart)="add(p.id)" />
 */
@Component({ /* … */ })
export class ProductCard {
  /** Producto a mostrar; el precio llega en COP enteros desde la API. */
  readonly product = input.required<Product>();
  /** Deshabilita las acciones mientras hay una operación en curso. */
  readonly busy = input(false);
  /** Se emite al pulsar "Agregar"; el padre decide cómo agregar. */
  readonly addToCart = output<void>();
}
```

---

## 13. Calidad de código: ESLint y Prettier

Las reglas de este archivo se verifican automáticamente en [eslint.config.js](eslint.config.js), que cita cada sección (§N). **Si cambias una regla aquí, cambia el linter en el mismo commit, y viceversa.**

| Bloque | Qué hace cumplir |
|---|---|
| TS base | `recommendedTypeChecked` + `stylisticTypeChecked` (linting con tipos): sin `any`, sin promesas sin manejar, sin aserciones innecesarias ni `!`, `import type` consistente, `===`, sin `console.log` |
| Angular (§4, §5) | OnPush, standalone, `input()`/`output()`/`model()` en lugar de decoradores, `inject()`, `host: {}`, signals siempre invocados, `takeUntilDestroyed` explícito, templates/estilos inline de máximo 15/20 líneas, prefijo `app` |
| Imports (§2, §4) | Alias en lugar de `../../../`; sin `NgClass`/`NgStyle`; `shared` no importa `features` ni `core` (salvo `@core/api`); una feature no importa `ui/` ni `pages/` de otra |
| Templates (§4, §10) | Control flow nativo, `[class.x]`, `ngSrc`, etiquetas autocerradas, sin estilos inline, `===`, sin `$any`, `type` en botones, reglas de accesibilidad (foco, teclado, `alt`, ARIA válido), complejidad ≤ 8 (aviso) |
| Documentación (§12) | TSDoc sin tipos y con etiquetas válidas; obligatorio en clases y funciones exportadas, en todo `input()`/`output()`/`model()` y en los métodos públicos de `*-store.ts` / `*-api.ts` |
| Tests (`*.spec.ts`) | Sin exigencia de TSDoc y con `!` permitido |
| Prettier | `eslint-config-prettier` va al final: el formato es de Prettier, no de ESLint |

Reglas de uso:

- **Antes de cada commit:** `npm run lint`, `npm run format:check`, `npx ng test --watch=false` y `npm run build`, todos en verde.
- Cero errores. Los avisos (complejidad de templates) se resuelven o se justifican.
- `// eslint-disable-next-line <regla> -- <motivo>` solo en casos puntuales, **siempre con la regla concreta y el motivo**. Prohibido desactivar una regla para un archivo completo o sin explicar por qué.
- No cambiar reglas para que el código pase: se corrige el código. Si una regla de verdad no encaja, se discute y se cambia aquí y en `eslint.config.js`.

---

## 14. Formato, idioma y textos

- UI en **español**. Código (identificadores) en inglés; comentarios en español (ver §12).
- Locale `es-CO` y moneda `COP` registrados en `app.config.ts`:
  `{{ price | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}` → `$ 189.900`.
- Prettier (`.prettierrc`: 100 columnas, comillas simples) para el formato; ver §13. No mezclar cambios de formato con cambios de lógica.

---

## 15. Git

- Conventional Commits con scope: `feat(frontend): …`, `fix(frontend): …`, `test(frontend): …`, `docs(frontend): …`.
- Commits pequeños y con sentido propio (uno por pieza: api, store, ui, page), no un commit final gigante.
- Los supuestos y recortes por tiempo se anotan en el README raíz a medida que aparecen.

---

## 16. Supuestos vigentes

- Sin autenticación real: usuario demo por `X-User-Id` (`core/session/session.ts`, usuarios 1 y 2).
- Imágenes de producto desde `picsum.photos` (las provee el backend).
- Line-heights móviles de la tipografía derivados proporcionalmente (el diseño solo define el tamaño de fuente).
