# Runner de pruebas

## Detectar
`package.json` → `scripts.test` y `devDependencies`:
| Señal | Runner | Comando de una corrida |
|---|---|---|
| `vitest` | Vitest | `npm test` (suele ser `vitest run`) o `npx vitest run` |
| `jest` | Jest | `npx jest` |
| Ninguno | `node:test` | `node --test` (con TS: `node --import tsx --test` o el loader del repo) |

En este repo: `cd backend && npm test` (Vitest) y `npm run typecheck` (`tsc --noEmit`). **Ejecuta siempre el typecheck en la fase RED**: Vitest transpila sin verificar tipos, así que un error de tipos no aparece como fallo de test.

## Comandos útiles (Vitest)
```bash
npx vitest run                         # toda la suite
npx vitest run tests/products          # filtrar por ruta
npx vitest run -t "debe devolver 409"  # filtrar por nombre
npx vitest run --coverage              # requiere @vitest/coverage-v8 (dependencia nueva: puerta humana)
```
Confirma las opciones con `npx vitest --help` en la versión instalada.

## ESM + TypeScript
- Con `"type": "module"` y `module: NodeNext`, los imports relativos llevan `.js` (`'../src/app.js'`). Un import sin extensión es un ❌ inválido típico.
- Vitest resuelve TS sin compilar; el build (`tsc`) sí exige las extensiones.

## Timers y tiempo
`vi.useFakeTimers()` y `vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))`; restaura con `vi.useRealTimers()` en `afterEach`. Mejor aún: inyecta un `clock` en los servicios.

## Clasificación de la salida
| Salida | Clasificación |
|---|---|
| `expected 501 to be 201` | ✅ esperado (esqueleto) |
| `Error: Not implemented` desde el servicio ejercitado | ✅ esperado |
| `AssertionError` sobre el cuerpo o el estado de la base | ✅ esperado |
| `Cannot find module '../src/modules/x/x.service.js'` | ❌ inválido (falta esqueleto o extensión) |
| `error TS2339` en el typecheck | ❌ inválido |
| `SqliteError: no such table: orders` | ❌ inválido (falta la migración mínima) |
| `expected 404 to be 201` (ruta no registrada) | ❌ inválido: registra la ruta con 501 |
| Test en verde sin implementación | ❌ inválido (no discrimina) |

## Jest / node:test
Equivalencias: `vi.fn` ↔ `jest.fn` ↔ `mock.fn` (`node:test`); `vi.useFakeTimers` ↔ `jest.useFakeTimers` ↔ `mock.timers.enable()`. Los principios no cambian.
