# Revisión del PR #1: feat(products): add products api and versioned migrations

| Campo | Valor |
|---|---|
| Feature | products-api |
| PR | https://github.com/lcRuiz/interstore/pull/1 |
| Rama | `feat/products-api` → `main` |
| Estado | **Cambios requeridos** (1 bloqueante) |
| Rondas | 1/3 |

## Ronda 1 (2026-11-05) · commit revisado `f51c9e9`

### Resumen
Trabajo sólido y bien razonado: capas limpias, SQL parametrizado, orden por lista blanca, `LIKE` escapado, errores sin fugas y una migración transaccional con control por `PRAGMA user_version`. La evidencia es reproducible (verifiqué typecheck, build, 185/185 tests, `npm audit --omit=dev` con 0 vulnerabilidades y un recorrido manual de la API compilada sobre una base temporal).

Hay **un bloqueante**: una restricción `CHECK` de la migración `0001_initial` que no hace lo que documenta. Una migración publicada no se edita, así que este es el último momento barato para corregirla.

### Trazabilidad
| Req. | ¿Test? | ¿Implementado? | Nota |
|---|---|---|---|
| R1/R5 paginación y página fuera de rango | sí | sí | `total` con el mismo `WHERE`; tope `page` evita un 500 por `OFFSET` desbordado |
| R2 filtro `category` | sí | sí | inexistente → 200 vacío; formato inválido → 400 (decisión declarada) |
| R3 búsqueda `q` | sí | sí | sin tildes ni mayúsculas; `%`, `_`, `\` literales (verificado: `q=%` → vacío) |
| R4 `sort` | sí | sí | lista blanca; desempate por `id` |
| R6 detalle | sí | sí | 200/404/400 |
| R7/R8 categorías y DTO | sí | sí | sin `search_name` ni columnas internas |
| A1 401 sin identidad | sí | sí | |
| D1–D6 migraciones y constraints | sí | **parcial** | ver B1: el `CHECK` de `slug` está probado con la semántica equivocada |

### Migraciones
| Migración | Reversible | Plan de rollback | Riesgo de datos | Veredicto |
|---|---|---|---|---|
| `0001_initial` | no (sin `down`) | sí, en el PR: backup + `db:reset`; el esquema anterior no es compatible | ninguno (sin datos productivos) | **Bloqueada por B1** |

### Contrato
| Endpoint | ¿Coincide con OpenAPI? | ¿Compatible? | Nota |
|---|---|---|---|
| `GET /api/products` | sí | nuevo | parámetros, límites y respuestas de error documentados |
| `GET /api/products/{id}` | sí | nuevo | |
| `GET /api/categories` | **ver B1** | nuevo | `Category.slug` declara `^[a-z0-9-]+$`, patrón que la base no garantiza |

### Comentarios
| ID | Nivel | Ubicación | Comentario | Propuesta |
|---|---|---|---|---|
| B1 | **bloqueante** | `backend/src/db/migrations/0001_initial.ts:17` | `CHECK (slug GLOB '[a-z0-9-]*')` solo exige que el **primer** carácter esté en la clase; el `*` final admite cualquier cosa. Comprobado con SQLite: `'ropa x'`, `'a;DROP'` y `'a/b?c=1'` pasan el `CHECK`. Un slug así sería imposible de filtrar (la query valida `^[a-z0-9-]{1,50}$`) y contradice el esquema OpenAPI. El test lo encoda mal: `migrations.test.ts:200` se llama «cuando el slug no empieza por [a-z0-9-]» y solo prueba `'Ropa2'`. El mismo DDL está en `docs/adr/0001-data-model.md` (origen de la propuesta). | Usar `CHECK (length(slug) BETWEEN 1 AND 50 AND slug NOT GLOB '*[^a-z0-9-]*')`; corregir el DDL del ADR; reemplazar el test por casos `'ropa x'`, `'a/b?c=1'`, `'Ropa2'`, `''`, y uno de aceptación (`'calzado-trail'`). La migración no está aplicada en ningún entorno compartido (las bases locales hay que recrearlas igualmente), así que editarla **en el mismo PR** es aceptable; si el usuario prefiere no editarla, habría que reconstruir `categories` en una `0002` (SQLite no permite `ALTER` de un `CHECK`). |
| S1 | sugerencia | `backend/README.md` («Problemas comunes») | Dice «anterior a 22.13», pero `engines.node` y la sección de requisitos ahora exigen `>=22.16`. | Actualizar el texto a 22.16. |
| S2 | sugerencia | `products.repository.ts` (`ORDER_BY`) | `sort=price`, `newest` y `name` no tienen índice (solo `(category_id, id)`): ordenan en memoria. Con ~40 filas es irrelevante, pero conviene dejarlo medido. | Anotar en `docs/features/products-api.md` el resultado de `EXPLAIN QUERY PLAN` y la señal para indexar (catálogo de cientos de miles de filas). No cambia el código hoy. |
| N1 | nit | `backend/src/db/connection.ts:29-33` | `enableForeignKeyConstraints: true` y `PRAGMA foreign_keys = ON` hacen lo mismo. | Dejar uno y comentar por qué (o mantener ambos como cinturón y tirantes, explicado). |
| N2 | nit | `.claude/skills/express-develop/references/security-rules.md` | El refinamiento de reglas SRB va en el mismo PR que la feature. Es coherente con el flujo, pero mezcla tooling y producto. | Aceptable; en el futuro, commit `docs(claude)` separado. |

### Lo que está bien (sin acción)
- `ORDER BY` por mapa constante + `z.enum`, `LIKE … ESCAPE '\'`, todos los valores como parámetros.
- `migrate()` valida versiones consecutivas, rechaza bases más nuevas que la aplicación y revierte versión y sentencias juntas.
- `search_name` normalizado con una única función compartida por seed y repositorio.
- El commit `feat(db)` pasa por sí solo y declara `BREAKING CHANGE`; el único test existente modificado está justificado y registrado.
- Limitaciones honestas y documentadas (un escritor, `LIKE` sin índice, `total` y página en dos lecturas).

### Checklist (express-develop/references/pr-checklist.md)
- Correctitud ✅ · Pruebas ⚠️ (B1) · Seguridad ✅ (0 críticos/altos; `X-User-Id` informativo) · Migraciones ⚠️ (B1) · Índices y rendimiento ✅ (S2) · Contrato ⚠️ (B1) · Errores ✅ · Legibilidad ✅ · Documentación ⚠️ (S1) · Commits ✅

### Decisiones y ajustes
| ID | Decisión | Justificación | Commit | Estado |
|---|---|---|---|---|
| B1 | aceptado | Es una restricción que no cumple su contrato; editar `0001_initial` en el PR es seguro porque no está aplicada en ningún entorno compartido (aprobado por el usuario al pedir «Aplicar ajustes» tras ver esta propuesta) | `e04606a` fix(db): enforce the full slug format in the categories check | cerrado |
| S1 | aceptado | Inconsistencia documental simple | `eaa4bef` | cerrado |
| S2 | aceptado | Dato medido (`EXPLAIN QUERY PLAN`) en la doc de la feature; no se agrega índice hoy | `eaa4bef` | cerrado |
| N1 | aceptado | Se conserva la redundancia y se explica con un comentario | `eaa4bef` | cerrado |
| N2 | rechazado | Es coherente con el flujo (las reglas `SRB` nacen de la auditoría de esta feature); se separará en commits `docs(claude)` en futuras features | — | justificado |

## Ronda 2 (2026-11-05) · delta `f51c9e9..eaa4bef`

### Verificación del delta
| Comprobación | Resultado |
|---|---|
| Test de B1 en rojo antes del fix | 4 fallos por aserción (`'ropa x'`, `'a;DROP'`, `'a/b?c=1'`, 51 caracteres); los de aceptación y los ya rechazados pasaban |
| Suite completa tras el fix | **194/194** (185 − 1 test reemplazado + 10 nuevos), typecheck y build ok |
| `scan-diff.mjs --base f51c9e9` | sin coincidencias (3 archivos, 23 líneas añadidas) |
| Revisión manual del delta | el cambio **endurece** una restricción; no elimina ninguna protección; el resto es comentario o documentación |

### Regla registrada
`SRB-013` (A06:2025, `CHECK` de formato que cubra el valor completo) en `express-develop/references/security-rules.md`.

### Estado
Sin bloqueantes abiertos. Sugerencias aceptadas y cerradas; N2 rechazado con justificación.
