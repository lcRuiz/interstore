# <Nombre de la feature>

> Estado: implementada · Rama: `<type>/<issue>-<desc>` · PR: #<n> · Última actualización: AAAA-MM-DD

## Propósito
Qué problema resuelve y para quién, en 2–3 líneas. Requerimientos cubiertos: R1, R2… (ver la matriz en el PR).

## Decisiones de diseño
| Decisión | Alternativas consideradas | Por qué |
|---|---|---|
| … | … | … |

## Estructura de archivos
```
frontend/src/app/features/<feature>/
├── data-access/
│   ├── <feature>-api.ts      cliente HTTP
│   ├── <feature>-store.ts    estado con signals
│   └── <feature>.types.ts    contrato
├── ui/…
└── pages/…
```

## API pública
### `<Store>`
| Miembro | Tipo | Descripción |
|---|---|---|
| `items` | `Signal<readonly Item[]>` | … |
| `add(id)` | acción | Optimista; rollback si falla; actualiza puntos con la respuesta |

### `<app-componente>`
| Input/Output | Tipo | Descripción |
|---|---|---|
| `product` (input, requerido) | `Product` | … |
| `addToCart` (output) | `void` | … |

### Endpoints consumidos
| Método | Ruta | Uso | Errores manejados |
|---|---|---|---|
| GET | `/api/…` | … | `NETWORK_ERROR`, `HTTP_ERROR`, … |

## Flujos
1. **Camino feliz:** usuario → componente → store → API → estado → UI.
2. **Error:** … → `ApiError` → estado `error` / rollback → mensaje.

## Seguridad
Resumen del informe `docs/security/<feature>-audit.md` (veredicto y reglas aplicadas).

## Supuestos y recortes
- SUPUESTO: …
- RECORTE: …

## Cómo probar
```bash
cd frontend && npx ng test --watch=false
```
Recorrido manual: 1) … 2) …
