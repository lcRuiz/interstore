# Formato del archivo de estado

Cada funcionalidad tiene un estado en `.workflow/<feature>/state.md`. Lo crea `angular-dev-agent` al arrancar y lo actualizan el agente y las skills al cerrar cada fase. Sirve para reanudar un flujo interrumpido y para auditar qué pasó.

Reglas:
- Solo hechos verificados: cada resultado cita su evidencia (comando + resumen de la salida real).
- Fechas en ISO (`2026-11-05`).
- No se borran entradas: las iteraciones se agregan al historial.
- Nada de secretos, tokens ni datos personales reales.

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
| Iniciado | AAAA-MM-DD |
| Actualizado | AAAA-MM-DD |

## Requerimiento
<texto original del usuario, sin parafrasear>

### Criterios de aceptación
- [ ] CA1: …
- [ ] CA2: …

## Entorno detectado
| Elemento | Valor | Evidencia |
|---|---|---|
| Raíz de la app | frontend/ | angular.json |
| Angular | 21.x | `npx ng version` |
| Runner | Vitest (@angular/build:unit-test) | angular.json → test.builder |
| Gestor de paquetes | npm 11 | package.json → packageManager |
| Lint / formato | `npm run lint`, `npm run format:check` | package.json |
| Convenciones | frontend/CLAUDE.md | — |
| gh | autenticado como <usuario> | `gh auth status` |

## Supuestos
- S1: …

## Decisiones pendientes (bloquean si son críticas)
- [ ] D1: <pregunta> — crítica: sí/no

## Fases
| Fase | Estado | Iteraciones | Evidencia | Artefactos |
|---|---|---|---|---|
| 1 test | pendiente / en curso / ok / fallida | 0/3 | `npx ng test --watch=false` → 9 tests, 9 fallos ✅ | test-matrix.md, red-report.md |
| 2 develop | | 0/3 | | green-report.md, docs/features/<feature>.md |
| 3 sec | | 0/3 | veredicto: … | docs/security/<feature>-audit.md |
| 4 git | | 0/3 | PR #… | docs/reviews/<feature>-pr-<n>.md |

## Cambios a tests existentes
| Test | Motivo (error demostrable / cambio de requerimiento) | Aprobado por | Fecha |
|---|---|---|---|

## Puertas humanas
| Acción | Resultado (aprobada/rechazada) | Fecha |
|---|---|---|

## Historial
- AAAA-MM-DD fase 1: …
- AAAA-MM-DD fase 2 iteración 2: …

## Bloqueo (solo si está escalado)
- Qué se intentó:
- Evidencia:
- Hipótesis:
- Opciones para el usuario:
```
