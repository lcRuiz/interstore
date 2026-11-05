import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/connection.js';
import { createEmptyApp, insertProduct, insertUser } from './factories.js';

let app: Express;
let db: Db;

const as = (userId: number) => ({
  get: (p: string) => request(app).get(p).set('X-User-Id', String(userId)),
  post: (p: string, body?: unknown) => request(app).post(p).set('X-User-Id', String(userId)).send(body as object),
  patch: (p: string, body?: unknown) => request(app).patch(p).set('X-User-Id', String(userId)).send(body as object),
  del: (p: string) => request(app).delete(p).set('X-User-Id', String(userId)),
});
const u1 = () => as(1);

const balance = (id = 1) => (db.prepare('SELECT points_balance AS b FROM users WHERE id = ?').get(id) as { b: number }).b;
const lines = (id = 1) => db.prepare('SELECT product_id, quantity FROM cart_items WHERE user_id = ?').all(id);
const ledger = () => (db.prepare('SELECT COUNT(*) AS n FROM points_ledger').get() as { n: number }).n;

beforeEach(() => {
  ({ app, db } = createEmptyApp());
  insertUser(db, { id: 2, name: 'Otro usuario' });
});

describe('GET /api/cart', () => {
  it('debe responder 401 cuando falta X-User-Id', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_USER');
  });

  it('debe responder un carrito vacío cuando el usuario no ha agregado nada', async () => {
    const res = await u1().get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { items: [], totalItems: 0, total: 0 } });
  });

  it('debe calcular totales y ordenar por added_at y productId', async () => {
    const a = insertProduct(db, { price: 1000, stock: 10 });
    const b = insertProduct(db, { price: 250, stock: 10 });
    await u1().post('/api/cart/items', { productId: b, quantity: 2 });
    await u1().post('/api/cart/items', { productId: a, quantity: 3 });
    const res = await u1().get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((i: { productId: number }) => i.productId)).toHaveLength(2);
    expect(res.body.data.totalItems).toBe(5);
    expect(res.body.data.total).toBe(3500);
    const item = res.body.data.items.find((i: { productId: number }) => i.productId === a);
    expect(item.lineTotal).toBe(3000);
    expect(item.product).toMatchObject({ id: a, price: 1000, stock: 10 });
    expect(item.product.category).toEqual({ slug: expect.any(String), name: expect.any(String) });
  });
});

describe('POST /api/cart/items', () => {
  it('debe agregar con cantidad 1 por defecto y otorgar +10', async () => {
    const p = insertProduct(db, { price: 500 });
    const res = await u1().post('/api/cart/items', { productId: p });
    expect(res.status).toBe(200);
    expect(res.body.rewards).toEqual({ awarded: 10, balance: 10 });
    expect(res.body.data).toMatchObject({ totalItems: 1, total: 500 });
    expect(balance()).toBe(10);
  });

  it('debe responder 401 sin X-User-Id', async () => {
    const res = await request(app).post('/api/cart/items').send({ productId: 1 });
    expect(res.status).toBe(401);
  });

  it('[1] debe dar +10 una sola vez en agregar, quitar y volver a agregar', async () => {
    const p = insertProduct(db);
    expect((await u1().post('/api/cart/items', { productId: p })).body.rewards.awarded).toBe(10);
    expect((await u1().del(`/api/cart/items/${p}`)).status).toBe(200);
    const again = await u1().post('/api/cart/items', { productId: p });
    expect(again.status).toBe(200);
    expect(again.body.rewards).toEqual({ awarded: 0, balance: 10 });
    expect(balance()).toBe(10);
    expect(ledger()).toBe(1);
  });

  it('[2] debe dar +10 una sola vez en dos POST seguidos y sumar la cantidad', async () => {
    const p = insertProduct(db, { stock: 10 });
    const r1 = await u1().post('/api/cart/items', { productId: p, quantity: 2 });
    const r2 = await u1().post('/api/cart/items', { productId: p, quantity: 3 });
    expect(r1.body.rewards.awarded).toBe(10);
    expect(r2.status).toBe(200);
    expect(r2.body.rewards).toEqual({ awarded: 0, balance: 10 });
    expect(r2.body.data.items[0].quantity).toBe(5);
  });

  it('[3] debe otorgar 10 y no 990 con quantity 99', async () => {
    const p = insertProduct(db, { stock: 500 });
    const res = await u1().post('/api/cart/items', { productId: p, quantity: 99 });
    expect(res.status).toBe(200);
    expect(res.body.rewards).toEqual({ awarded: 10, balance: 10 });
  });

  it('[4] debe responder 409 OUT_OF_STOCK sin línea ni puntos con producto agotado', async () => {
    const p = insertProduct(db, { stock: 0 });
    const res = await u1().post('/api/cart/items', { productId: p });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OUT_OF_STOCK');
    expect(lines()).toEqual([]);
    expect(balance()).toBe(0);
    expect(ledger()).toBe(0);
  });

  it('[5] debe responder 404 PRODUCT_NOT_FOUND sin efectos con producto inexistente', async () => {
    const res = await u1().post('/api/cart/items', { productId: 9999 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
    expect(lines()).toEqual([]);
    expect(ledger()).toBe(0);
  });

  it.each([0, -1, 1.5, 'abc', 100, null])('[6] debe responder 400 sin efectos con quantity %j', async (quantity) => {
    const p = insertProduct(db, { stock: 500 });
    const res = await u1().post('/api/cart/items', { productId: p, quantity });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(lines()).toEqual([]);
    expect(ledger()).toBe(0);
  });

  it.each([{}, { productId: 'x' }, { productId: 0 }, { productId: 1.2 }])(
    'debe responder 400 con productId inválido %j',
    async (body) => {
      const res = await u1().post('/api/cart/items', body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it.each([{ points: 1000 }, { userId: 2 }, { awarded: 500 }, { price: 1 }])(
    '[7] debe responder 400 con campo extra %j sin afectar saldo ni precio',
    async (extra) => {
      const p = insertProduct(db, { price: 7000 });
      const res = await u1().post('/api/cart/items', { productId: p, ...extra });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(balance()).toBe(0);
      expect(balance(2)).toBe(0);
      expect(lines()).toEqual([]);
    },
  );

  it('[8] debe aislar el carrito y el saldo entre usuarios', async () => {
    const p = insertProduct(db);
    await u1().post('/api/cart/items', { productId: p });
    const other = await as(2).get('/api/cart');
    expect(other.body.data.items).toEqual([]);
    expect(balance(2)).toBe(0);
    const patch = await as(2).patch(`/api/cart/items/${p}`, { quantity: 2 });
    expect(patch.status).toBe(404);
    await as(2).del(`/api/cart/items/${p}`);
    expect(lines(1)).toHaveLength(1);
    const own = await as(2).post('/api/cart/items', { productId: p });
    expect(own.body.rewards).toEqual({ awarded: 10, balance: 10 });
    expect(balance(1)).toBe(10);
  });

  it('[10] debe responder 409 QUANTITY_EXCEEDS_STOCK sin modificar línea ni saldo', async () => {
    const p = insertProduct(db, { stock: 3 });
    await u1().post('/api/cart/items', { productId: p, quantity: 2 });
    const res = await u1().post('/api/cart/items', { productId: p, quantity: 2 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUANTITY_EXCEEDS_STOCK');
    expect(res.body.error.details).toEqual({ available: 3 });
    expect(lines()).toEqual([{ product_id: p, quantity: 2 }]);
    expect(balance()).toBe(10);
  });

  it('debe rechazar una cantidad inicial mayor al stock sin dejar línea ni puntos', async () => {
    const p = insertProduct(db, { stock: 2 });
    const res = await u1().post('/api/cart/items', { productId: p, quantity: 5 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUANTITY_EXCEEDS_STOCK');
    expect(lines()).toEqual([]);
    expect(ledger()).toBe(0);
  });

  it('[11] debe calcular el total con el precio del catálogo', async () => {
    const p = insertProduct(db, { price: 2000, stock: 10 });
    const res = await u1().post('/api/cart/items', { productId: p, quantity: 2, price: 1 });
    expect(res.status).toBe(400);
    const ok = await u1().post('/api/cart/items', { productId: p, quantity: 2 });
    expect(ok.body.data.total).toBe(4000);
  });
});

describe('PATCH /api/cart/items/:productId', () => {
  it('debe establecer la cantidad y [9] no otorgar puntos', async () => {
    const p = insertProduct(db, { stock: 10, price: 100 });
    await u1().post('/api/cart/items', { productId: p });
    const res = await u1().patch(`/api/cart/items/${p}`, { quantity: 7 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalItems: 7, total: 700 });
    expect(res.body.rewards).toEqual({ awarded: 0, balance: 10 });
  });

  it('debe responder 404 CART_ITEM_NOT_FOUND si la línea no existe', async () => {
    const p = insertProduct(db);
    const res = await u1().patch(`/api/cart/items/${p}`, { quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CART_ITEM_NOT_FOUND');
    expect(balance()).toBe(0);
  });

  it.each([{ quantity: 0 }, { quantity: 100 }, { quantity: 1.5 }, { quantity: 'a' }, {}, { quantity: 1, points: 5 }])(
    'debe responder 400 con body %j',
    async (body) => {
      const p = insertProduct(db, { stock: 500 });
      await u1().post('/api/cart/items', { productId: p });
      const res = await u1().patch(`/api/cart/items/${p}`, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('debe responder 400 con :productId inválido', async () => {
    const res = await u1().patch('/api/cart/items/abc', { quantity: 1 });
    expect(res.status).toBe(400);
  });

  it('[10] debe responder 409 QUANTITY_EXCEEDS_STOCK sin cambiar la línea', async () => {
    const p = insertProduct(db, { stock: 3 });
    await u1().post('/api/cart/items', { productId: p, quantity: 2 });
    const res = await u1().patch(`/api/cart/items/${p}`, { quantity: 4 });
    expect(res.status).toBe(409);
    expect(res.body.error.details).toEqual({ available: 3 });
    expect(lines()).toEqual([{ product_id: p, quantity: 2 }]);
    expect(balance()).toBe(10);
  });

  it('debe responder 401 sin X-User-Id', async () => {
    const res = await request(app).patch('/api/cart/items/1').send({ quantity: 1 });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/cart/items/:productId', () => {
  it('debe quitar la línea sin restar puntos', async () => {
    const p = insertProduct(db);
    await u1().post('/api/cart/items', { productId: p });
    const res = await u1().del(`/api/cart/items/${p}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.rewards).toEqual({ awarded: 0, balance: 10 });
  });

  it('debe ser idempotente cuando la línea no existe', async () => {
    const res = await u1().del('/api/cart/items/12345');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { items: [], totalItems: 0, total: 0 },
      rewards: { awarded: 0, balance: 0 },
    });
  });

  it('debe responder 400 con :productId inválido y 401 sin usuario', async () => {
    expect((await u1().del('/api/cart/items/0')).status).toBe(400);
    expect((await request(app).delete('/api/cart/items/1')).status).toBe(401);
  });
});
