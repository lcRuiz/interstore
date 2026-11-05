# Revisión del PR #2: feat(catalog): add paginated product catalog with url filters

| Campo | Valor |
|---|---|
| Feature | catalog-web |
| PR | https://github.com/lcRuiz/interstore/pull/2 |
| Rama | `feat/catalog-web` → `main` |
| Estado | **Cambios requeridos** (1 bloqueante) |
| Rondas | 1/3 |

## Ronda 1 (2026-11-05) · commit revisado `35b6c75`

### Resumen
Trabajo sólido y bien razonado: la URL es la fuente de verdad, los parámetros se validan antes de llegar a la API, `switchMap` evita que una respuesta vieja pise a la nueva, el error no filtra mensajes del servidor y la tarjeta quedó lista para recibir acciones. La evidencia es reproducible: 108/108 tests, lint, formato y build en verde, y un recorrido manual en el navegador contra la API real (filtros, búsqueda sin tildes, enlace directo, Atrás, estado vacío, error con «Reintentar» tras detener y reiniciar el backend, escritorio y móvil) con la consola sin avisos `NG0`.

Hay **un bloqueante** de accesibilidad: el contenedor de resultados queda marcado como «ocupado» también en los estados de error y vacío, que son justo los que tienen que anunciarse.

### Trazabilidad
| Req. | ¿Test? | ¿Implementado? | Nota |
|---|---|---|---|
| R1 listado desde el servidor | sí | sí | `CatalogApi` + `CatalogStore`; sin filtrar ni paginar en cliente |
| R2 filtros en la URL | sí | sí | normalización de params inválidos antes de la API |
| R3 categoría, búsqueda (debounce 300), orden | sí | sí | verificado en navegador |
| R4 paginación accesible | sí | sí | `nav`, `aria-current`, extremos deshabilitados |
| R5 estados carga / error / vacío / éxito | sí | **parcial** | ver B1 (`aria-busy` en error y vacío) |
| R6 tarjeta (COP, Puntos x2, Agotado) | sí | sí | |
| R7 responsive | verificado a mano | sí | 2 y 4 columnas |
| R8 «Mostrando X de Y» con `aria-live` | sí | sí | |

### Comentarios
| ID | Nivel | Ubicación | Comentario | Propuesta |
|---|---|---|---|---|
| B1 | **bloqueante** | `catalog-page.html:18` | `[attr.aria-busy]="state().status === 'success' ? null : 'true'"` deja `aria-busy="true"` en **todos** los estados que no son éxito, incluidos `error` y `empty`. `aria-busy` indica que el contenido se sigue modificando y los lectores de pantalla pueden esperar a que termine: en error y vacío nunca termina, y el `role="alert"` de `ErrorState` queda dentro de una región «ocupada», con riesgo de no anunciarse. Contradice la intención documentada en `product-grid-skeleton.ts:7` («anuncia la carga con `aria-busy`») y el requisito de que error y vacío se anuncien (CLAUDE.md §10). Ningún test lo cubre. | `'true'` solo con `status === 'loading'` (y `idle`), `null` en el resto. Test: en `error` y `empty` el contenedor no lleva `aria-busy`; en `loading` sí. |
| S1 | sugerencia | `catalog-page.ts` / `app.config.ts` | Al pulsar «Siguiente», la paginación está al final de la lista y el router, por defecto, no reposiciona el scroll: el usuario queda abajo de la página nueva. **No lo verifiqué en el navegador**; se deduce de que no hay `withInMemoryScrolling` ni `scrollTo` en ningún lado. | `withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })` en `provideRouter`, o llevar el foco/scroll al encabezado de resultados al cambiar de página (mejor para teclado y lectores). Un test del comportamiento elegido. |
| S2 | sugerencia | `catalog-page.html:39-48` | Una página fuera de rango (`?page=99`) muestra «No hay productos para este filtro» y **sin paginación** (solo se renderiza en éxito). El mensaje es engañoso (el filtro sí tiene productos) y la única salida es «Limpiar filtros», que además pierde los demás filtros. Está documentado como supuesto, pero se llega fácil por un enlace viejo. | Si el estado es `empty` y `meta.total > 0`, mostrar «Esa página no existe» con un botón «Ir a la última página» (o redirigir a `totalPages`). |
| S3 | sugerencia | `catalog-filters.ts:78-87` | `text` es un `linkedSignal` cuya computación **muta** `pendingEcho` (efecto secundario dentro de un cómputo que Angular puede re-evaluar). Si el eco de la URL nunca llega (navegación cancelada), `pendingEcho` queda colgado y una navegación Atrás posterior a ese mismo valor se tomaría por eco y no actualizaría el campo. Es la parte más difícil de razonar del PR. | Simplificar (p. ej. no sincronizar el campo mientras tiene el foco) o, como mínimo, agregar un test del caso de eco que no llega y comentar el invariante. |
| N1 | nit | `product-card.html:23` | Salto de encabezados: `h1` «Catálogo» → `h3` en cada tarjeta. | `h2` por tarjeta. |
| N2 | nit | `catalog-query.ts:5` y `catalog-filters.ts:18` | `MAX_SEARCH_LENGTH = 80` está duplicada (espejo del límite del backend). | Una sola constante en `catalog.types.ts`. |
| N3 | nit | `error-state.ts:31` | Para errores no reintentables (p. ej. 401 por usuario desconocido) el texto es «Revisa los filtros…», que no ayuda en ese caso. | Mensaje distinto para 401/403. |
| N4 | nit | PR (`.claude/skills/angular-develop/references/security-rules.md`) | El refinamiento de reglas SR va en el mismo PR que la feature (igual que en el PR #1). Coherente con el flujo. | Aceptable; en el futuro, commit `docs(claude)` aparte. |

### Lo que está bien (sin acción)
- `parseCatalogQuery` valida cada parámetro con los mismos límites del backend (slug, `page` ≤ 1 000 000, `q` ≤ 80, `sort` en lista cerrada); `HttpParams` codifica los valores.
- `CatalogStore`: `switchMap` + `catchError` dentro (el flujo sobrevive a un error) y `takeUntilDestroyed`.
- `ErrorState` decide por `status === 0` y no por `code` (hallazgo SEC-catalog-web-01 resuelto con test en rojo previo).
- Imágenes: solo `https:`, `referrerpolicy="no-referrer"`, modo `fill`, `priority` en la primera fila y `preconnect`.
- Sin dependencias nuevas ni cambios en `backend/`.

### Checklist (angular-develop/references/pr-checklist.md)
- Correctitud ✅ (B1 aparte) · Pruebas ✅ 108/108; ⚠️ falta test del `aria-busy` · Seguridad ✅ APROBADO, 0 críticos/altos · Rendimiento ✅ (chunk lazy de 21,65 kB) · Accesibilidad ⚠️ B1, N1 · Legibilidad ⚠️ S3 · Documentación ✅ · Commits ✅ (5, Conventional Commits; test+feat fusionados y declarado)

### Decisiones y ajustes
| ID | Decisión | Justificación | Commit | Estado |
|---|---|---|---|---|
| B1 | aceptado | `aria-busy` solo mientras carga; en error y vacío el contenido es definitivo y debe anunciarse | `0fbc778` fix(catalog): mark the results region as busy only while loading | cerrado |
| S1 | diferido | El usuario pidió aplicar solo el bloqueante; queda como mejora (scroll al paginar, sin verificar en navegador) | — | abierto (no bloquea) |
| S2 | diferido | Ídem; página fuera de rango sin salida clara, documentado como supuesto | — | abierto (no bloquea) |
| S3 | diferido | Ídem; simplificar `pendingEcho` o agregar el test del eco que no llega | — | abierto (no bloquea) |
| N1 | diferido | Ídem; encabezado `h2` por tarjeta | — | abierto |
| N2 | diferido | Ídem; constante `MAX_SEARCH_LENGTH` duplicada | — | abierto |
| N3 | diferido | Ídem; mensaje para 401/403 | — | abierto |
| N4 | aceptado | Coherente con el flujo; en el futuro, commit `docs(claude)` aparte | — | cerrado |

## Ronda 2 (2026-11-05) · delta `35b6c75..0fbc778`

### Verificación del delta
| Comprobación | Resultado |
|---|---|
| Tests de B1 en rojo antes del fix | 2 fallos por aserción (vacío y error: `expected true to be false`); cargando y éxito ya pasaban |
| Suite completa tras el fix | **112/112** (108 + 4 nuevos); lint, formato y build ok |
| `scan-diff.mjs` sobre el delta | 1 coincidencia, falso positivo: la palabra «role» en un comentario del spec |
| Revisión manual del delta | un solo atributo de plantilla y sus tests; no toca datos, red ni rutas |

### Estado
Sin bloqueantes abiertos. Quedan 3 sugerencias y 3 nits diferidos por decisión del usuario; ninguno bloquea el merge.
