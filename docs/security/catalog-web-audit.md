# Auditoría de seguridad: catalog-web

| Campo | Valor |
|---|---|
| Fecha | 2026-11-05 |
| Edición OWASP | OWASP Top 10:2025 (verificada en top10.owasp.org el 2026-11-05: la web redirige a la edición 2025) |
| Rama / base | `feat/catalog-web` vs `main` (merge-base `73fff64`) |
| Commits en alcance | Árbol de trabajo previo a los commits (todo sin commitear); el delta del fix SEC-catalog-web-01 se re-auditó aparte |
| Iteraciones de remediación | 1/3 |
| **Veredicto** | **APROBADO** |

## Alcance
Archivos auditados (nuevos o modificados, 30 del barrido más el fix):
```
frontend/src/app/features/catalog/data-access/{catalog.types,catalog-query,catalog-api,catalog-store}.ts (+ specs)
frontend/src/app/features/catalog/ui/{_grid.scss, product-card, product-grid-skeleton, catalog-filters}/*
frontend/src/app/features/catalog/pages/catalog-page/{catalog-page.ts,.html,.scss,.spec.ts}
frontend/src/app/shared/ui/{pagination,empty-state,error-state}/*
docs/features/catalog-web.md
```
Sin cambios en `package.json`, `package-lock.json`, `backend/` ni en el interceptor `X-User-Id`.
Fuera de alcance (consultados solo para entender flujos): `core/session/user-id.interceptor.ts`, `core/api/api-error*.ts`, `app.config.ts`.

## Metodología
1. Barrido automático: `node .claude/skills/angular-sec/scripts/scan-diff.mjs --base main` → 4 coincidencias tras el fix (3 antes; todas falsos positivos, ver abajo); 2447 líneas añadidas analizadas.
2. Revisión manual de cada archivo con el checklist A01–A10. Búsqueda dirigida (Grep) de `innerHTML`, `bypassSecurity`, `outerHTML`, `document.write`, `eval`, `new Function`, `localStorage`, `sessionStorage`, `console.`, `target=`, `window.open`, `[href]`, `[src]` en el código nuevo no-spec: **0 coincidencias**.
3. Dependencias: `git diff main -- frontend/package.json frontend/package-lock.json` vacío (no se añadió ninguna).
4. Flujos revisados leyendo el código: URL → inputs → `parseCatalogQuery` → `CatalogApi` → `HttpParams`; respuesta → `ProductCard`; `ApiError` → `ErrorState`.

## Resumen
| Severidad | Abiertos | Resueltos | Aceptados | Falsos positivos |
|---|---|---|---|---|
| Crítica | 0 | 0 | — | 0 |
| Alta | 0 | 0 | — | 0 |
| Media | 0 | 0 | 0 | 0 |
| Baja | 0 | 1 | 0 | 0 |
| Informativa | 3 | — | — | 3 (escáner) |

## Cobertura por categoría
| Categoría | Aplica | Resultado |
|---|---|---|
| A01:2025 Broken Access Control | sí | Sin hallazgos. No hay guards ni ids de usuario desde la UI; `X-User-Id` lo añade el interceptor existente solo a `/api`. Ver riesgo del backend |
| A02:2025 Security Misconfiguration | sí | INFO-02 (preexistente): sin CSP en `index.html` |
| A03:2025 Software Supply Chain Failures | sí | Sin dependencias nuevas |
| A04:2025 Cryptographic Failures | no | Sin tokens ni secretos; nada en `localStorage`/`sessionStorage` |
| A05:2025 Injection | sí | Sin `innerHTML`/`bypassSecurityTrust*`. Params de la URL validados en `parseCatalogQuery` y enviados con `HttpParams` (codifica `&`, `#`; test dedicado). `imageUrl` restringida a `https:` |
| A06:2025 Insecure Design | sí | Búsqueda con debounce de 300 ms y cancelación (`switchMap`); `page` acotada a 1..1000000, `q` a 80, igual que el servidor |
| A07:2025 Authentication Failures | no | Fuera de alcance (sesión simulada, supuesto de la prueba) |
| A08:2025 Software or Data Integrity Failures | sí | Respuestas tipadas; el cliente no calcula precios ni puntos, solo formatea. Sin scripts de terceros |
| A09:2025 Security Logging and Alerting Failures | sí | Sin `console.*` en el código nuevo; el mensaje del servidor no se muestra ni se registra |
| A10:2025 Mishandling of Exceptional Conditions | sí | Todo flujo tiene estado de error: productos (`error` + Reintentar si `retryable`), categorías (lista vacía y reintento en la próxima carga), `reload` sin consulta previa es no-op. SEC-catalog-web-01 (resuelto) |

## Hallazgos

### SEC-catalog-web-01 · A10:2025 / A09:2025 · Baja · RESUELTO
- Archivo: `frontend/src/app/shared/ui/error-state/error-state.ts` (`message`).
- Evidencia: `if (error.code === 'NETWORK_ERROR') return error.message;`
- Impacto: `ApiError.code` también lo fija el servidor (`isApiErrorBody` acepta cualquier `code`). Un cuerpo de error con `code: 'NETWORK_ERROR'` hacía que se mostrara al usuario un `message` del servidor, saltándose la regla de no exponer mensajes del backend (podría filtrar detalles internos). Se muestra con interpolación (sin riesgo de XSS), de ahí severidad baja.
- Falso positivo: probabilidad baja (el backend actual devuelve `INTERNAL_ERROR` genérico), pero el patrón era incorrecto.
- Remediación: decidir por `error.status === 0` (solo lo produce el cliente cuando no hay respuesta).
- Estado: test de regresión en rojo (`error-state.spec.ts › no debe mostrar el mensaje del servidor aunque su code sea NETWORK_ERROR`, falló con `expected 'No pudimos cargar los datosFallo inte…' not to contain '/srv/app'`) → fix → suite 105/105 en verde, lint y format en verde.

### Falsos positivos del escáner
| Regla | Ubicación | Motivo del descarte |
|---|---|---|
| client-authz | `error-state.html:1` y `error-state.spec.ts:21`, `:50`, `:69` | Coincidencia con `role="alert"` (ARIA), no con autorización |

### Informativos
- INFO-01 (diseño, sin acción): las imágenes se cargan de `picsum.photos` (terceros); el navegador envía IP y user-agent a ese host. Mitigado con `referrerpolicy="no-referrer"` y solo `https:`. En producción convendría servir las imágenes desde un host propio o CDN controlado.
- INFO-02 (preexistente, fuera de alcance): `index.html` no define una Content-Security-Policy. Una CSP con `img-src 'self' https://picsum.photos` y `connect-src 'self'` reduciría el impacto de cualquier XSS futuro. Se recomienda configurarla al desplegar.
- INFO-03 (preexistente): `userIdInterceptor` usa `req.url.startsWith('/api')`, que también coincidiría con una ruta tipo `/apiary`; no es explotable hoy porque todas las URLs son fijas y relativas. Endurecer a `'/api/'` es trivial en otra feature.

## Remediaciones
| Hallazgo | Test de regresión | Fix | Re-auditoría del delta |
|---|---|---|---|
| SEC-catalog-web-01 | `error-state.spec.ts › no debe mostrar el mensaje del servidor aunque su code sea NETWORK_ERROR` | `error-state.ts`: condición `error.status === 0` | Delta = una condición y un test; sin nuevos sinks, imports ni dependencias. Sin hallazgos nuevos |

## Riesgos del backend (fuera del alcance del frontend)
- `X-User-Id` es suplantable por cualquier cliente (supuesto documentado de la prueba técnica); la autorización real no existe todavía.
- `GET /api/products?q=` no declara límite de tasa; el cliente mitiga con debounce y cancelación, pero un cliente malicioso puede saltárselos. Recomendado: rate limiting en el servidor.

## Riesgo residual
Bajo. Dependencia de un host de imágenes de terceros y ausencia de CSP (ambos informativos).

## Reglas registradas en security-rules.md
| Regla | Acción | Motivo |
|---|---|---|
| SR-002 | Refinada | Añade `imageUrl`/`[ngSrc]` (no pasa por el sanitizador de URL), validación de `https:` y `referrerpolicy` |
| SR-007 | Refinada | No mostrar `ApiError.message` del servidor; decidir por `status === 0` y no por `code` (SEC-catalog-web-01) |
| SR-010 | Nueva | Validar y normalizar params de la URL antes de la API y enviarlos con `HttpParams` |
