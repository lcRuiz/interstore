# Catálogo web (frontend)

> Estado: implementada · Rama: `feat/catalog-web` · PR: pendiente (puerta humana) · Última actualización: 2026-11-05

## Propósito
Página de catálogo que consume la paginación, el filtro, la búsqueda y el orden del backend (`GET /api/products`, `GET /api/categories`). Los filtros viven en la URL, de modo que el enlace se puede compartir y el botón Atrás funciona. Requerimientos cubiertos: R1–R8 (ver la matriz en la descripción del PR).

## Decisiones de diseño
| Decisión | Alternativas consideradas | Por qué |
|---|---|---|
| URL como fuente de verdad: los query params llegan como `input()` (`withComponentInputBinding`), se validan con `parseCatalogQuery` y una acción solo navega; el cambio de URL dispara la consulta | Estado local en el store y sincronizar la URL con un `effect` | Un solo sentido de flujo (URL → store); Atrás/Adelante y enlaces compartidos funcionan sin código extra |
| Validar los params de la URL antes de la API (`page` 1..1000000, `sort` en lista, `category` slug, `q` ≤ 80) | Enviarlos tal cual y dejar que el servidor responda 400 | Un enlace manipulado no produce errores ni peticiones inválidas; el 400 queda como caso excepcional |
| `HttpClient` + `switchMap` en el store | `httpResource`/`resource` | `httpResource` es experimental; `HttpClient` es estable y se prueba con `HttpTestingController`. `switchMap` cancela la petición vieja (`req.cancelled`): una respuesta antigua nunca pisa a la nueva |
| Debounce de 300 ms en `CatalogFilters`; solo emite si el texto recortado difiere del vigente en la URL | `distinctUntilChanged()` clásico | `distinctUntilChanged` solo compara con la emisión anterior y bloquearía escribir `a`, ir Atrás y volver a escribir `a`; comparar contra la URL equivale en el caso normal y es correcto con Atrás/Adelante |
| El campo de búsqueda sigue a `q` salvo que `q` sea el eco de lo emitido | Enlazar `[value]="q()"` directamente | Sin esa guarda, el eco de la URL pisa lo que el usuario sigue escribiendo |
| `pageSize` fijo en 12 | Selector de tamaño | Default del servidor y divisible entre 2, 3 y 4 columnas; acota el alcance |
| `NgOptimizedImage` (`ngSrc` + `width`/`height` 480) sin loader | `<img src>` simple; configurar un loader para picsum | El loader por defecto deja la URL intacta y `width`/`height` evita saltos de layout. `picsum.photos` no tiene loader de Angular; añadir uno (y `preconnect`) sería configuración sin beneficio con 12 imágenes perezosas |
| Imagen solo si `imageUrl` es `https:`; `referrerpolicy="no-referrer"` | Confiar en la API | La URL viene de la API: se descarta cualquier otro esquema (SR-002) |
| `ErrorState` no muestra el `message` del servidor | Mostrar `ApiError.message` | Puede filtrar detalles internos; la UI decide por tipo de error (CLAUDE.md §6) |
| `pagination`, `empty-state` y `error-state` en `shared/ui` | Dentro de `features/catalog/ui` | No conocen el dominio y los reutilizarán carrito y recompensas |
| Tarjeta con slot `[card-actions]` | Botones de carrito/favoritos ya en la tarjeta | Esas acciones llegan con sus features; la tarjeta queda lista sin acoplarse |

## Estructura de archivos
```
frontend/src/app/
├── features/catalog/
│   ├── data-access/
│   │   ├── catalog.types.ts   contrato (Product, Category, ProductQuery…)
│   │   ├── catalog-query.ts   parseCatalogQuery / toQueryParams (validación de la URL)
│   │   ├── catalog-api.ts     HTTP
│   │   └── catalog-store.ts   estado con signals
│   ├── ui/
│   │   ├── _grid.scss         mixin de la grilla (compartido con el skeleton)
│   │   ├── product-card/  product-grid-skeleton/  catalog-filters/
│   └── pages/catalog-page/
└── shared/ui/{pagination,empty-state,error-state}/
```

## API pública
### `CatalogStore` (`providedIn: 'root'`)
| Miembro | Tipo | Descripción |
|---|---|---|
| `state` | `Signal<LoadState<Product[]>>` | `idle`, `loading`, `success`, `empty` o `error` de la página actual |
| `meta` | `Signal<PageMeta \| null>` | Metadatos de la última respuesta (se conservan también en `empty`) |
| `categories` | `Signal<Category[]>` | Vacío mientras cargan o si falló |
| `load(query)` | acción | `loading` inmediato; cancela la petición anterior |
| `reload()` | acción | Repite la última consulta (Reintentar) |
| `loadCategories()` | acción | Una sola vez; si falla, la próxima llamada reintenta |

### Componentes
| Componente | Inputs / Outputs |
|---|---|
| `app-product-card` | `product` (requerido); slot `[card-actions]` |
| `app-product-grid-skeleton` | `count` (12) |
| `app-catalog-filters` | `categories`, `category`, `q`, `sort` / `categoryChange`, `searchChange`, `sortChange` |
| `app-pagination` | `page`, `totalPages` / `pageChange` |
| `app-empty-state` | `message`, `actionLabel` / `action` |
| `app-error-state` | `error` / `retry` |
| `app-catalog-page` (ruta `/`) | inputs de router: `category`, `q`, `sort`, `page` |

### Endpoints consumidos
| Método | Ruta | Uso | Errores manejados |
|---|---|---|---|
| GET | `/api/products?page&pageSize&category&q&sort` | Página de productos | `NETWORK_ERROR`, `INTERNAL_ERROR` (reintentables); `VALIDATION_ERROR`, 401 (sin reintento) |
| GET | `/api/categories` | Filtro de categorías | Cualquiera: el filtro queda solo con «Todas» |

## Flujos
1. **Camino feliz:** el usuario cambia un filtro → `CatalogPage` navega con los nuevos query params (y sin `page`) → cambian los inputs → `parseCatalogQuery` → `CatalogStore.load` → `CatalogApi.listProducts` → `success` → grilla, contador «Mostrando X de Y productos» y paginación.
2. **Vacío:** `data: []` (filtro sin resultados o página fuera de rango) → «No hay productos para este filtro» + «Limpiar filtros» (navega a `/`).
3. **Error:** `ApiError` → estado `error` → texto propio; «Reintentar» solo si `retryable`.
4. **Búsqueda:** tecleo → 300 ms → `searchChange` → navegación con `q` → consulta; una consulta nueva cancela la anterior.

## Accesibilidad
`<label>` asociado a búsqueda, categoría y orden; contador con `aria-live="polite"`; `nav aria-label="Paginación"` con `aria-current="page"` y botones deshabilitados en los extremos; `aria-busy` en el contenedor de resultados mientras no hay éxito; skeleton con `aria-hidden`; error con `role="alert"`; objetivos táctiles de 44 px; foco visible global.

## Seguridad
Ver `docs/security/catalog-web-audit.md`.

## Supuestos y recortes
- SUPUESTO: `pageSize` fijo en 12.
- SUPUESTO: si fallan las categorías, el catálogo sigue funcionando.
- SUPUESTO: una página fuera de rango se muestra como vacío con «Limpiar filtros» (el servidor responde 200 con `data: []`).
- RECORTE: sin `priority`/`preconnect` para las imágenes de la primera fila (LCP).
- RECORTE: los números de página son botones (no enlaces), así que no se abren en otra pestaña.
- RECORTE: sin pruebas visuales automatizadas; la verificación contra la API real es manual.

## Cómo probar
```bash
cd frontend && npx ng test --watch=false
```
Recorrido manual (backend en `:3000` y `npm start`): 1) abrir `/` y ver 12 productos y «Mostrando 12 de N productos»; 2) elegir una categoría y comprobar que la URL cambia y `page` desaparece; 3) escribir en la búsqueda y ver una sola petición 300 ms después; 4) ir a la página 2 y usar Atrás; 5) abrir `/?page=abc&sort=x` y comprobar que carga la primera página.
