# Plantilla: spec de repositorio con SQLite en memoria

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../src/db/connection.js';
import { createOrdersRepository, type OrdersRepository } from '../src/modules/orders/orders.repository.js';
import { insertProduct, insertUser, makeProduct, makeUser } from './factories.js';

describe('OrdersRepository', () => {
  let db: Db;
  let repo: OrdersRepository;

  beforeEach(() => {
    db = openDatabase(':memory:'); // mismas migraciones y PRAGMAs que producción
    repo = createOrdersRepository(db);
  });

  afterEach(() => db.close());

  it('debe tener las claves foráneas activas cuando se abre la conexión', () => {
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
  });

  it('debe crear el pedido con sus ítems cuando los datos son válidos', () => {
    const user = insertUser(db, makeUser());
    const product = insertProduct(db, makeProduct({ price: 1000, stock: 5 }));
    const order = repo.create({ userId: user.id, items: [{ productId: product.id, quantity: 2, unitPrice: 1000 }] });
    expect(order.total).toBe(2000);
  });

  it('debe lanzar un error de FK cuando el producto no existe', () => {
    const user = insertUser(db, makeUser());
    expect(() => repo.create({ userId: user.id, items: [{ productId: 999, quantity: 1, unitPrice: 1 }] })).toThrow(/FOREIGN KEY/);
  });

  it('debe revertir todo cuando falla la inserción de un ítem', () => {
    // Arrange: segundo ítem inválido; Act: create lanza; Assert: 0 pedidos y 0 ítems
  });
});
```

## Spec de migraciones
```ts
it('debe crear las tablas e índices esperados cuando se aplican las migraciones desde cero', () => {
  const db = openDatabase(':memory:');
  const names = db.prepare("SELECT name FROM sqlite_schema WHERE type IN ('table','index') ORDER BY name").all();
  expect(names).toEqual(expect.arrayContaining([{ name: 'orders' }, { name: 'idx_orders_user' }]));
});

it('debe ser idempotente cuando las migraciones se aplican dos veces', () => {
  const db = openDatabase(':memory:');
  expect(() => migrate(db)).not.toThrow();
});
```
