# Formato del archivo de estado (backend)

`.workflow/<feature>/state.md`. Lo crea `express-dev-agent` y lo actualizan el agente y las skills al cerrar cada fase.

Reglas:
- Solo hechos verificados: cada resultado cita su evidencia (comando + resumen de la salida real).
- Fechas ISO. No se borran entradas: las iteraciones se agregan al historial.
- **Nada de secretos, contenido de `.env`, cadenas de conexión ni datos reales de la base.**

---

```markdown
# Estado: <feature>

| Campo | Valor |
|---|---|
| Feature | <feature-en-kebab-case> |
| Rama | <type>/<issue>-<descripcion-corta> |
| Rama base | main |
| Fase actual | 0-contexto · 1-test · 2-develop · 3-sec · 4-git · completado · detenido · escalado |
| Límite de iteraciones por bucle | 3 |
| Iniciado / actualizado | AAAA-MM-DD / AAAA-MM-DD |

## Requerimiento
<texto original del usuario>

### Criterios de aceptación
- [ ] CA1: …

## Entorno detectado
| Elemento | Valor | Evidencia |
|---|---|---|
| Raíz del backend | backend/ | package.json |
| Node | 24.x | `node --version` |
| Módulos / lenguaje | ESM + TypeScript strict | package.json "type", tsconfig.json |
| Express | 5.x (errores async nativos) | `npm ls express` |
| Driver SQLite | node:sqlite (estabilidad X en Node 24, ver doc) | `src/db/connection.ts` |
| Migraciones | esquema idempotente / versionadas en … | `src/db/…` |
| Validación | Zod 4 | package.json |
| Runner | Vitest + supertest | package.json |
| Formato de error | `{ error: { code, message, details? } }` | `src/errors/app-error.ts` |
| Factoría | `createApp({ db })` | `src/app.ts` |
| OpenAPI | no existe / `openapi.yaml` | — |
| Base local de desarrollo | `data/store.db` (DB_PATH por defecto) | `.env.example` |
| gh | autenticado como <usuario> | `gh auth status` |

## Supuestos
- S1: …

## Decisiones pendientes
- [ ] D1: <pregunta> — crítica: sí/no

## Modelo de datos y migraciones
| Migración | Cambio | Reversible | Aplicada en | Evidencia |
|---|---|---|---|---|
| 0002_orders | crea `orders`, `order_items` | sí (down) / no (motivo) | `:memory:` (tests) | suite verde |

## Endpoints afectados
| Método | Ruta | Cambio | ¿Rompe compatibilidad? |
|---|---|---|---|

## Fases
| Fase | Estado | Iteraciones | Evidencia | Artefactos |
|---|---|---|---|---|
| 1 test | | 0/3 | `npm test` → N tests, N fallos ✅ | test-matrix.md, red-report.md |
| 2 develop | | 0/3 | | green-report.md, docs/features/…, openapi.yaml |
| 3 sec | | 0/3 | veredicto: … | docs/security/<feature>-audit.md |
| 4 git | | 0/3 | PR #… | docs/reviews/<feature>-pr-<n>.md |

## Cambios a tests existentes
| Test | Motivo | Aprobado por | Fecha |
|---|---|---|---|

## Puertas humanas
| Acción | Resultado | Fecha |
|---|---|---|

## Historial
- AAAA-MM-DD fase 1: …

## Bloqueo (solo si está escalado)
- Qué se intentó / evidencia / hipótesis / opciones
```
