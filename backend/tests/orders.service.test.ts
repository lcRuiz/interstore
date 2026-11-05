import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/connection.js';
import { createCartRepository } from '../src/modules/cart/cart.repository.js';
import { createOrdersRepository } from '../src/modules/orders/orders.repository.js';
import { createOrdersService } from '../src/modules/orders/orders.service.js';
import { createEmptyDb, insertProduct, insertUser } from './factories.js';

describe('orders service', () => {
  let db: Db;
  beforeEach(() => {
    db = createEmptyDb();
    insertUser(db, { id: 1 });
  });

  const n = (sql: string): number => (db.prepare(sql).get() as { n: number }).n;

  it('[12] debe revertir pedido, stock y carrito si falla la inserción en el ledger', () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, ?, 2)').run(p);
    const repo = createOrdersRepository(db);
    const failing = {
      ...repo,
      awardPurchase: () => {
        throw new Error('ledger down');
      },
    };
    const service = createOrdersService(db, failing, createCartRepository(db));
    expect(() => service.checkout(1, 'rollback-key-01')).toThrow('ledger down');
    expect(n('SELECT COUNT(*) AS n FROM orders')).toBe(0);
    expect(n('SELECT COUNT(*) AS n FROM order_items')).toBe(0);
    expect(n(`SELECT stock AS n FROM products WHERE id = ${p}`)).toBe(5);
    expect(n('SELECT COUNT(*) AS n FROM cart_items')).toBe(1);
    expect(n('SELECT points_balance AS n FROM users WHERE id = 1')).toBe(0);
  });

  it('[12] debe revertir todo si falla la inserción de una línea del pedido', () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, ?, 2)').run(p);
    const repo = createOrdersRepository(db);
    const failing = {
      ...repo,
      insertItem: () => {
        throw new Error('items down');
      },
    };
    const service = createOrdersService(db, failing, createCartRepository(db));
    expect(() => service.checkout(1, 'rollback-key-02')).toThrow('items down');
    expect(n('SELECT COUNT(*) AS n FROM orders')).toBe(0);
    expect(n(`SELECT stock AS n FROM products WHERE id = ${p}`)).toBe(5);
  });

  it('debe abortar con rollback si el descuento de stock no afecta filas (defensa extra)', () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, ?, 2)').run(p);
    const failing = { ...createOrdersRepository(db), decrementStock: () => false };
    const service = createOrdersService(db, failing, createCartRepository(db));
    expect(() => service.checkout(1, 'rollback-key-03')).toThrow(/stock/i);
    expect(n('SELECT COUNT(*) AS n FROM orders')).toBe(0);
    expect(n('SELECT COUNT(*) AS n FROM cart_items')).toBe(1);
  });
});
