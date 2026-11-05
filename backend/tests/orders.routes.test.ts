import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import type { Db } from '../src/db/connection.js';
import { createEmptyApp, insertProduct, insertUser } from './factories.js';

const KEY = 'checkout-key-0001';

let app: Express;
let db: Db;

beforeEach(() => {
  ({ app, db } = createEmptyApp());
  insertUser(db, { id: 2, name: 'Otro usuario' });
});

/** Carrito por SQL directo (no depende del código bajo prueba). */
function addToCart(userId: number, productId: number, quantity: number): void {
  db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(userId, productId, quantity);
}
/** `key` = `null` omite el header (un `undefined` activaría el valor por defecto). */
const checkout = (userId: number, key: string | null = KEY) => {
  const req = request(app).post('/api/orders').set('X-User-Id', String(userId));
  return key === null ? req : req.set('Idempotency-Key', key);
};
const count = (sql: string, ...params: number[]): number =>
  (db.prepare(sql).get(...params) as { n: number }).n;
const stockOf = (id: number): number => (db.prepare('SELECT stock FROM products WHERE id = ?').get(id) as { stock: number }).stock;
const balanceOf = (id: number): number =>
  (db.prepare('SELECT points_balance AS n FROM users WHERE id = ?').get(id) as { n: number }).n;
const ledgerSum = (id: number): number =>
  (db.prepare('SELECT COALESCE(SUM(points), 0) AS n FROM points_ledger WHERE user_id = ?').get(id) as { n: number }).n;
const orders = () => count('SELECT COUNT(*) AS n FROM orders');
const cartLines = (id: number) => count('SELECT COUNT(*) AS n FROM cart_items WHERE user_id = ?', id);

describe('POST /api/orders', () => {
  it('debe responder 401 sin X-User-Id', async () => {
    const res = await request(app).post('/api/orders').set('Idempotency-Key', KEY);
    expect(res.status).toBe(401);
  });

  it('debe crear el pedido desde el carrito y responder 201 con puntos', async () => {
    const shirt = insertProduct(db, { name: 'Camiseta', price: 590_000, stock: 10 });
    const shoe = insertProduct(db, { name: 'Zapato', price: 2_490_000, stock: 5, pointsMultiplier: 2 });
    addToCart(1, shirt, 2);
    addToCart(1, shoe, 1);
    const res = await checkout(1);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'confirmed',
      total: 590_000 * 2 + 2_490_000,
      totalItems: 3,
      pointsAwarded: 118 + 498,
    });
    expect(res.body.data.id).toEqual(expect.any(Number));
    expect(res.body.data.createdAt).toEqual(expect.any(String));
    expect(res.body.data.items).toEqual(
      expect.arrayContaining([
        { productId: shirt, name: 'Camiseta', unitPrice: 590_000, quantity: 2, lineTotal: 1_180_000 },
        { productId: shoe, name: 'Zapato', unitPrice: 2_490_000, quantity: 1, lineTotal: 2_490_000 },
      ]),
    );
    expect(res.body.rewards).toEqual({ awarded: 616, balance: 616 });
    expect(res.body.data.userId).toBeUndefined();
  });

  it('[1] debe devolver el mismo pedido con 200 en un doble envío y no repetir stock ni puntos', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 2);
    const first = await checkout(1);
    const second = await checkout(1);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
    expect(second.body.data.pointsAwarded).toBe(20);
    expect(second.body.rewards).toEqual({ awarded: 0, balance: 20 });
    expect(orders()).toBe(1);
    expect(stockOf(p)).toBe(3);
    expect(ledgerSum(1)).toBe(20);
  });

  it('[1] debe ser un replay aunque el carrito se haya vuelto a llenar', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    const first = await checkout(1);
    addToCart(1, p, 3);
    const second = await checkout(1);
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(stockOf(p)).toBe(4);
    expect(cartLines(1)).toBe(1);
  });

  it('[2] debe crear pedidos distintos con la misma clave en otro usuario', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    addToCart(2, p, 1);
    const a = await checkout(1);
    const b = await checkout(2);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    expect(b.body.data.id).not.toBe(a.body.data.id);
    expect(stockOf(p)).toBe(3);
  });

  it('[3] debe responder 409 EMPTY_CART con carrito vacío, sin pedido ni puntos', async () => {
    const res = await checkout(1);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMPTY_CART');
    expect(orders()).toBe(0);
    expect(ledgerSum(1)).toBe(0);
  });

  it('[4] debe responder 409 QUANTITY_EXCEEDS_STOCK sin cambiar nada (sin parciales)', async () => {
    const ok = insertProduct(db, { stock: 10 });
    const bad = insertProduct(db, { stock: 2 });
    addToCart(1, ok, 3);
    addToCart(1, bad, 5);
    const res = await checkout(1);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'QUANTITY_EXCEEDS_STOCK', details: { productId: bad, available: 2 } });
    expect(stockOf(ok)).toBe(10);
    expect(stockOf(bad)).toBe(2);
    expect(cartLines(1)).toBe(2);
    expect(balanceOf(1)).toBe(0);
    expect(orders()).toBe(0);
  });

  it('[5] debe responder 409 OUT_OF_STOCK con una línea agotada', async () => {
    const ok = insertProduct(db, { stock: 4 });
    const gone = insertProduct(db, { stock: 1 });
    addToCart(1, ok, 1);
    addToCart(1, gone, 1);
    db.prepare('UPDATE products SET stock = 0 WHERE id = ?').run(gone);
    const res = await checkout(1);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'OUT_OF_STOCK', details: { productId: gone } });
    expect(stockOf(ok)).toBe(4);
    expect(orders()).toBe(0);
  });

  it('[6] debe vender la última unidad solo al primero y nunca dejar stock negativo', async () => {
    const p = insertProduct(db, { stock: 1 });
    addToCart(1, p, 1);
    addToCart(2, p, 1);
    const [a, b] = await Promise.all([checkout(1, 'compite-key-001'), checkout(2, 'compite-key-002')]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(stockOf(p)).toBe(0);
    expect(orders()).toBe(1);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe('OUT_OF_STOCK');
  });

  it('[7] debe rechazar un body con price, total, points o userId y no usarlo', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    for (const body of [{ price: 1 }, { total: 1 }, { points: 9999 }, { userId: 2 }]) {
      const res = await checkout(1).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(orders()).toBe(0);
    expect(stockOf(p)).toBe(5);
    expect(balanceOf(1)).toBe(0);
  });

  it('[7] debe ignorar headers falsos y calcular total y precio desde el catálogo', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 2);
    const res = await checkout(1).set('X-Price', '1').set('X-Total', '1').set('X-Points', '9999').send({});
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(200_000);
    expect(res.body.data.items[0].unitPrice).toBe(100_000);
    expect(res.body.data.pointsAwarded).toBe(20);
  });

  it('[8] debe dar los puntos exactos y el saldo igual a la suma del ledger', async () => {
    const a = insertProduct(db, { price: 15_000, stock: 5 }); // 1
    const b = insertProduct(db, { price: 19_999, stock: 5, pointsMultiplier: 2 }); // 3
    const c = insertProduct(db, { price: 9_999, stock: 5 }); // 0
    addToCart(1, a, 1);
    addToCart(1, b, 1);
    addToCart(1, c, 1);
    const res = await checkout(1);
    expect(res.body.data.pointsAwarded).toBe(4);
    expect(balanceOf(1)).toBe(ledgerSum(1));
    expect(balanceOf(1)).toBe(4);
  });

  it('[8] debe dar pointsAwarded 0 sin tocar el ledger cuando el pedido no alcanza un punto', async () => {
    const p = insertProduct(db, { price: 5_000, stock: 5 });
    addToCart(1, p, 1);
    const res = await checkout(1);
    expect(res.status).toBe(201);
    expect(res.body.data.pointsAwarded).toBe(0);
    expect(res.body.rewards).toEqual({ awarded: 0, balance: 0 });
    expect(count("SELECT COUNT(*) AS n FROM points_ledger WHERE action = 'PURCHASE'")).toBe(0);
  });

  it('[10] debe responder 400 sin efectos con Idempotency-Key ausente, corta, larga o inválida', async () => {
    const p = insertProduct(db, { stock: 5 });
    addToCart(1, p, 1);
    const keys = [null,'corta12', 'x'.repeat(65), 'clave con espacios', 'clave;drop-table', 'clave-ñandú-01'];
    for (const key of keys) {
      const res = await checkout(1, key);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(orders()).toBe(0);
    expect(stockOf(p)).toBe(5);
    expect(cartLines(1)).toBe(1);
    expect(ledgerSum(1)).toBe(0);
  });

  it('[10] debe aceptar claves de 8 y de 64 caracteres válidos', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    expect((await checkout(1, 'abcd_123')).status).toBe(201);
    addToCart(1, p, 1);
    expect((await checkout(1, 'A'.repeat(32) + '-_'.repeat(16))).status).toBe(201);
  });

  it('[11] debe vaciar el carrito y responder 409 EMPTY_CART con una clave nueva, sin repetir puntos', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 2);
    await checkout(1);
    expect(cartLines(1)).toBe(0);
    const again = await checkout(1, 'otra-clave-0002');
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('EMPTY_CART');
    expect(balanceOf(1)).toBe(20);
    expect(orders()).toBe(1);
  });

  it('[13] debe mantener independientes los puntos CART_ADD y PURCHASE', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    const add = () => request(app).post('/api/cart/items').set('X-User-Id', '1').send({ productId: p });
    expect((await add()).body.rewards).toEqual({ awarded: 10, balance: 10 });
    const res = await checkout(1);
    expect(res.body.data.pointsAwarded).toBe(10);
    expect(res.body.rewards).toEqual({ awarded: 10, balance: 20 });
    const after = await add();
    expect(after.body.rewards).toEqual({ awarded: 0, balance: 20 });
    expect(ledgerSum(1)).toBe(20);
  });

  it('[14] debe conservar nombre y precio de la compra aunque el producto cambie', async () => {
    const p = insertProduct(db, { name: 'Original', price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    const created = await checkout(1);
    db.prepare("UPDATE products SET price = 999999, name = 'Cambiado' WHERE id = ?").run(p);
    const res = await request(app).get(`/api/orders/${created.body.data.id}`).set('X-User-Id', '1');
    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toMatchObject({ name: 'Original', unitPrice: 100_000, lineTotal: 100_000 });
    expect(res.body.data.total).toBe(100_000);
  });

  it('[15] debe descontar el stock exacto y permitir llegar a 0', async () => {
    const p = insertProduct(db, { stock: 3 });
    const q = insertProduct(db, { stock: 7 });
    addToCart(1, p, 3);
    addToCart(1, q, 2);
    expect((await checkout(1)).status).toBe(201);
    expect(stockOf(p)).toBe(0);
    expect(stockOf(q)).toBe(5);
  });

  it('debe responder 400 con un JSON malformado', async () => {
    const res = await checkout(1).set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|at .*\.(ts|js)/);
  });
});

describe('GET /api/orders/:id', () => {
  it('debe responder 401 sin X-User-Id', async () => {
    expect((await request(app).get('/api/orders/1')).status).toBe(401);
  });

  it('debe devolver el pedido propio con 200', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 2);
    const created = await checkout(1);
    const res = await request(app).get(`/api/orders/${created.body.data.id}`).set('X-User-Id', '1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: created.body.data });
  });

  it('[9] debe responder 404 ORDER_NOT_FOUND al pedir el pedido de otro usuario, sin alterar nada', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    addToCart(2, p, 1);
    const created = await checkout(1);
    const res = await request(app).get(`/api/orders/${created.body.data.id}`).set('X-User-Id', '2');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    expect(JSON.stringify(res.body)).not.toContain('100000');
    expect(balanceOf(2)).toBe(0);
    expect(cartLines(2)).toBe(1);
  });

  it('debe responder 404 ORDER_NOT_FOUND si no existe', async () => {
    const res = await request(app).get('/api/orders/9999').set('X-User-Id', '1');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('debe responder 400 con un id no decimal positivo', async () => {
    for (const id of ['0', '-1', 'abc', '1e3', '0x10', '1.5', '99999999999']) {
      const res = await request(app).get(`/api/orders/${id}`).set('X-User-Id', '1');
      expect(res.status, id).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('errores inesperados', () => {
  it('debe responder 500 uniforme sin fugas si falla la base', async () => {
    const p = insertProduct(db, { price: 100_000, stock: 5 });
    addToCart(1, p, 1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.exec('DROP TRIGGER trg_points_ledger_balance');
    db.exec('ALTER TABLE points_ledger RENAME TO points_ledger_x');
    const res = await checkout(1);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/points_ledger|SQLITE|at .*\.ts/i);
  });
});
