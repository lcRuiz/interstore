# Auditoría de seguridad: products-api (API)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-05 |
| Edición OWASP | OWASP Top 10:2025 (verificada en top10.owasp.org el 2026-11-05; la página redirige a la edición 2025) |
| Rama / base | `feat/products-api` vs `main` (merge-base `3847f29`) |
| Commits en alcance | `93b92fa` (ADR) + cambios de la feature sin commitear al momento de la auditoría (se commitean después) |
| Migraciones en alcance | `0001_initial` |
| Dependencias nuevas/modificadas | ninguna (`package.json` solo cambia `engines.node` a `>=22.16`; `package-lock.json` sin cambios). `npm audit --omit=dev`: 0 vulnerabilidades |
| Iteraciones de remediación | 0/3 (sin hallazgos accionables) |
| **Veredicto** | **APROBADO** |

## Alcance
Archivos auditados (21 por `scan-diff.mjs` + el ADR y la regla `SRB-*`):
```
backend/openapi.yaml, backend/package.json, backend/src/app.ts
backend/src/db/{connection,migrate,search-name,seed}.ts, backend/src/db/migrations/0001_initial.ts
backend/src/modules/products/{categories.routes,products.repository,products.routes,products.schemas,products.service}.ts
backend/tests/{app,factories,migrations,products.repository,products.routes,products.service,search-name,seed}.*
docs/adr/0001-data-model.md (eliminado: backend/src/db/schema.ts)
```
Consultados fuera de alcance: `src/middleware/current-user.ts`, `src/middleware/validate.ts`, `src/errors/*`, `src/config.ts`, `src/server.ts`, `src/db/reset.ts` (sin cambios).

## Metodología
1. `node .claude/skills/express-sec/scripts/scan-diff.mjs --base main` → 22 coincidencias, todas descartadas (detalle abajo).
2. Revisión manual de cada archivo con `express-checklist.md` y `sqlite-security.md`: se siguió cada valor de `req.query` / `req.params` / `X-User-Id` hasta su destino (SQL, log, respuesta).
3. `npm audit --omit=dev` → `found 0 vulnerabilities`.
4. Comprobación de que Express 5 usa el parser de query `simple` (sin objetos anidados: `a[b]=c` no crea objetos; `__proto__` solo llega como cadena).
5. Pruebas de mutación manuales sobre el repositorio (quitar el escape de `LIKE` rompe 4 tests; quitar `ESCAPE` rompe 12).

### Triage de las 22 coincidencias del barrido
| Coincidencia | Decisión | Motivo |
|---|---|---|
| `migrate.ts:49` `exec(PRAGMA user_version = ${version})` (alta) | Falso positivo | `version` es un entero que el propio código valida (`version === índice + 1`) antes; viene de constantes del repositorio, nunca de una petición. `PRAGMA` no admite parámetros enlazados |
| `products.repository.ts:101,104,108` interpolación en SQL (alta x3) | Falso positivo | Solo se concatenan fragmentos constantes (`'c.slug = ?'`, el `LIKE ... ESCAPE`) y el `ORDER BY` elegido de un mapa constante; todos los valores del cliente (`category`, `q`, límites) viajan como parámetros `?` |
| `products.repository.ts:108` `ORDER BY` desde la petición (alta) | Falso positivo | `sort` pasa por `z.enum(['name','price','newest'])` en el borde y el repositorio solo busca en un `Record` constante. Test: `sort=name;DROP TABLE products`, `name'--`, `(SELECT 1)`, `__proto__` → 400 con la tabla intacta |
| `search-name.ts:7,10` `LIKE` sin ESCAPE (baja x2) | Falso positivo | Son comentarios TSDoc |
| `products.repository.ts:124` listado de categorías sin LIMIT (baja) | Aceptado como informativo (INFO-05) | La tabla es de catálogo, sin escritura por el usuario |
| Tests: `DELETE`/`DROP`, `__proto__`, `NOT LIKE`, listados sin LIMIT (13) | Falso positivo | Código de prueba sobre `:memory:`; los `DROP`/`__proto__`/`;DROP` son payloads de ataque que el test envía para comprobar el rechazo |

## Resumen
| Severidad | Abiertos | Resueltos | Aceptados | Falsos positivos |
|---|---|---|---|---|
| Crítica | 0 | 0 | — | 0 |
| Alta | 0 | 0 | — | 5 (del barrido) |
| Media | 0 | 0 | 0 | 8 (tests) |
| Baja | 0 | 0 | 0 | 8 (+1 informativa) |
| Informativa | 5 | — | — | — |

## Cobertura por categoría
| Categoría | Aplica | Resultado |
|---|---|---|
| A01:2025 Broken Access Control | Sí | Las 3 rutas se montan bajo `requireUser` (`app.ts:36-37`); 401 sin header o con usuario desconocido (tests). El catálogo es común a todos los usuarios: no hay recursos por dueño (sin IDOR/BOLA). Sin SSRF: ninguna petición saliente. Sin rutas de escritura (POST → 404 con test) |
| A02:2025 Security Misconfiguration | Sí | `x-powered-by` desactivado, CORS con origen explícito y límite de body (preexistentes). 500 genérico sin stack ni SQL (test sobre las 3 rutas con tablas eliminadas). `PRAGMA foreign_keys=ON`, WAL y `busy_timeout` en archivo |
| A03:2025 Software Supply Chain Failures | Sí | Sin dependencias nuevas; lockfile intacto; `npm audit` 0 vulnerabilidades |
| A04:2025 Cryptographic Failures | Parcial | Sin secretos, contraseñas ni `.env` en el diff; `.env.example` sin cambios. Datos de seed sintéticos |
| A05:2025 Injection | Sí | SQL 100 % parametrizado; `ORDER BY` por lista blanca; `LIKE` con `ESCAPE` y `% _ \` escapados (tests con `' OR 1=1 --`, `'; DROP TABLE`, `%`, `_`, `\`); `:id` con regex decimal estricta; `category` con regex de slug. Migración: SQL constante |
| A06:2025 Insecure Design | Sí | `pageSize` ≤ 50, `q` ≤ 80, `page` ≤ 1 000 000 (un `page` ~1e20 provocaba `datatype mismatch` en `OFFSET`: verificado con `node:sqlite`, cubierto por tests de 400), `id` ≤ 10 dígitos. Orden estable por `id`. `UNIQUE`/`CHECK` del modelo protegen futuras reglas de puntos |
| A07:2025 Authentication Failures | Sí | `X-User-Id` simulado: riesgo aceptado e informativo (INFO-01) |
| A08:2025 Software or Data Integrity Failures | Sí | Migración transaccional con `user_version` atómico, versiones consecutivas, rechazo de base más nueva que el código, ledger append-only por trigger. Sin deserialización ni scripts de instalación |
| A09:2025 Security Logging and Alerting Failures | Sí | El error handler existente registra el error 500 en el servidor y no devuelve detalle al cliente. No se registran headers ni bodies. Sin logging nuevo |
| A10:2025 Mishandling of Exceptional Conditions | Sí | Errores de SQLite → 500 genérico (test). `openDatabase` cierra la conexión si falla la migración; `transaction` hace rollback. `total` y página son dos lecturas sin transacción (solo lectura en esta feature; documentado) |

## Hallazgos
No hay hallazgos críticos, altos ni medios. Observaciones informativas:

### SEC-products-api-01 · Identidad simulada por `X-User-Id`
- **Categoría:** A07:2025 Authentication Failures
- **Severidad:** Informativa. Porque: supuesto declarado de la prueba técnica; cualquier cliente puede suplantar a otro usuario. En esta feature el catálogo no es específico del usuario, así que no expone datos ajenos.
- **Ubicación:** `backend/src/middleware/current-user.ts` (preexistente, fuera del diff)
- **Remediación:** reemplazar por sesión/JWT verificados antes de exponer carrito, pedidos o puntos (SRB-012).
- **Estado:** riesgo aceptado (supuesto de la prueba)

### SEC-products-api-02 · Sin rate limiting
- **Categoría:** A06:2025 Insecure Design
- **Severidad:** Informativa. Porque: la API no limita la tasa de peticiones (preexistente). El coste por petición está acotado (`q` ≤ 80, `pageSize` ≤ 50, tabla pequeña), pero `LIKE '%q%'` recorre la tabla.
- **Remediación:** limitador por IP/usuario y FTS5 si el catálogo crece (SRB-007).
- **Estado:** abierto, informativo

### SEC-products-api-03 · `ORDER_BY[query.sort]` sin comprobación de propiedad propia
- **Categoría:** A05:2025 Injection (defensa en profundidad)
- **Severidad:** Informativa. Porque: el repositorio solo recibe `sort` validado por `z.enum` y su tipo es `ProductSort`; un valor como `constructor` solo produciría un error de SQL (500 genérico), nunca contenido controlado.
- **Remediación opcional:** `Object.hasOwn(ORDER_BY, sort)` o `Map` si el repositorio se reutiliza fuera de este flujo.
- **Estado:** abierto, informativo

### SEC-products-api-04 · Imágenes de terceros
- **Categoría:** A03:2025 Software Supply Chain Failures / privacidad
- **Severidad:** Informativa. Porque: `imageUrl` apunta a `picsum.photos` (heredado del seed anterior); el navegador del cliente contacta a un tercero. No hay petición saliente del servidor.
- **Estado:** aceptado para la demo

### SEC-products-api-05 · Listado de categorías sin LIMIT
- **Categoría:** A06:2025 Insecure Design
- **Severidad:** Informativa. Porque: la tabla es de catálogo (3 filas, sin escritura por usuarios).
- **Remediación:** agregar `LIMIT`/paginación si algún día lo edita un administrador o el volumen crece.
- **Estado:** aceptado

## Remediaciones
| Hallazgo | Test de regresión | Fix | Re-auditoría del delta |
|---|---|---|---|
| (ninguno accionable) | — | — | — |

## Riesgos del despliegue (fuera del código)
- Permisos del archivo `data/store.db` (y de `-wal`/`-shm`), backups y ubicación fuera del directorio servido; está en `.gitignore`.
- `db:reset` borra la base: no debe ejecutarse en un entorno con datos reales (no hay protección adicional más allá de `DB_PATH`).
- TLS, `trust proxy` y CORS dependen del despliegue (`CORS_ORIGIN`).
- Un único proceso escritor: no escalar horizontalmente con SQLite.

## Riesgo residual
Bajo. Superficie de solo lectura, con entradas validadas y consultas parametrizadas. El riesgo dominante es la identidad simulada (INFO-01), aceptada por diseño.

## Reglas registradas en security-rules.md
| Regla | Nueva / refinada | Motivo |
|---|---|---|
| SRB-002 | Refinada | `WHERE` dinámico con fragmentos constantes + parámetros, búsqueda normalizada (`search_name`), orden por columna normalizada con desempate por id |
| SRB-007 | Refinada | Tope de `page` (OFFSET desbordado → 500, verificado) y validación de ids de ruta con regex decimal en lugar de `z.coerce.number()` |
| SRB-011 | Refinada | Migraciones transaccionales con `user_version`, versiones consecutivas, rechazo de base más nueva, nunca editar una migración aplicada |

## Re-auditoría del delta (revisión del PR #1, ronda 1)
- Alcance: `f51c9e9..eaa4bef` (`0001_initial.ts`, `connection.ts`, `migrations.test.ts`, ADR y documentación).
- Cambio relevante: el `CHECK` de `categories.slug` pasa de `GLOB '[a-z0-9-]*'` (solo validaba el primer carácter) a `length(slug) BETWEEN 1 AND 50 AND slug NOT GLOB '*[^a-z0-9-]*'`. Es integridad de datos / diseño (A06:2025), severidad baja: la API ya validaba el slug de la query, pero la base no garantizaba el formato que promete el contrato.
- `scan-diff.mjs --base f51c9e9`: sin coincidencias. Revisión manual: el cambio endurece una restricción y no elimina ninguna protección.
- Veredicto sin cambios: **APROBADO**.
