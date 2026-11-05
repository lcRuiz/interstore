# Pruebas con SQLite en memoria

## Por qué `:memory:` y no mocks
Una base en memoria con las **migraciones reales** ejecuta el SQL real: detecta errores de sintaxis, columnas inexistentes, constraints violados, problemas de tipos y migraciones rotas. Crear una base nueva por test cuesta milisegundos.

## Setup por test
```ts
let db: Db;
beforeEach(() => {
  db = openDatabase(':memory:'); // misma función que producción: PRAGMAs + migraciones
});
afterEach(() => db.close());
```
- Usa **la misma función de apertura que producción**, para que los PRAGMAs (`foreign_keys`, etc.) sean idénticos. Un test con otra configuración prueba otra base.
- Alternativa para suites lentas: una base por archivo y una transacción por test (`BEGIN` en `beforeEach`, `ROLLBACK` en `afterEach`). Ojo: si el código bajo prueba abre su propia transacción, SQLite no anida `BEGIN`; usa `SAVEPOINT` o vuelve a una base por test.

## Drivers (verifica la API en la doc oficial de tu versión)
| Driver | Apertura en memoria | Notas |
|---|---|---|
| `node:sqlite` | `new DatabaseSync(':memory:')` (en versiones recientes de Node, `DatabaseSync` es alias de `Database`) | Sin helper de transacción: `exec('BEGIN')`/`COMMIT`/`ROLLBACK`. Opciones como `enableForeignKeyConstraints` y `timeout` dependen de la versión |
| `better-sqlite3` | `new Database(':memory:')` | `db.transaction(fn)` |
| `sqlite3` | `new sqlite3.Database(':memory:')` | API asíncrona con callbacks |

## Casos de datos obligatorios
```ts
it('debe rechazar un order_item con product_id inexistente cuando las FK están activas', () => {
  const pragma = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
  expect(pragma.foreign_keys).toBe(1);
  expect(() => repo.addItem({ orderId: 1, productId: 999, quantity: 1 })).toThrow(/FOREIGN KEY/);
});

it('debe revertir el pedido completo cuando falla el descuento de stock de un ítem', () => {
  const before = countRows(db, 'orders');
  expect(() => service.checkout(userId)).toThrow(AppError);
  expect(countRows(db, 'orders')).toBe(before);           // nada a medias
  expect(stockOf(db, productA)).toBe(initialStockA);      // rollback también del ítem que sí se descontó
});
```
- `UNIQUE`: insertar dos veces → error tipado (el servicio lo traduce a `409`, que lo prueba el test HTTP).
- `NOT NULL` / `CHECK`: valores inválidos que pasaran la validación HTTP por error.
- **Concurrencia**: SQLite tiene un único escritor. Con una sola conexión, las escrituras se serializan; prueba la **lógica** (no vender más stock del disponible con dos checkouts seguidos). Probar `SQLITE_BUSY` exige dos conexiones a un archivo temporal (no `:memory:`): solo si el diseño usa varias conexiones, con `busy_timeout` documentado.

## Migraciones
- **Desde cero**: `openDatabase(':memory:')` aplica todas y el esquema resultante tiene las tablas e índices esperados (`SELECT name FROM sqlite_schema WHERE type IN ('table','index')`).
- **Idempotencia**: aplicar dos veces no falla ni duplica (si el diseño es idempotente) o la versión (`PRAGMA user_version` o tabla de migraciones) avanza exactamente una vez.
- **Datos existentes** (si la migración transforma datos): sembrar el estado previo con la migración N-1, aplicar N y verificar el resultado.
- **Archivo temporal** (solo si hace falta probar WAL o persistencia): directorio temporal del SO, borrado en `afterEach`. Nunca la base de desarrollo.

## Fixtures
Factories pequeñas + inserciones explícitas por test. Evita `seed` globales que acoplan los tests entre sí; si el repo tiene un seed de demo, no lo uses como fixture de pruebas salvo para tests de caracterización.
