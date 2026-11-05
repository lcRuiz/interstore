import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Db } from '../src/db/connection.js';
import { createCartRepository } from '../src/modules/cart/cart.repository.js';
import { createCartService } from '../src/modules/cart/cart.service.js';
import { CART_ADD_POINTS } from '../src/modules/rewards/rewards.js';
import { createEmptyDb, insertProduct, insertUser } from './factories.js';

describe('rewards', () => {
  it('debe fijar CART_ADD en 10 puntos', () => {
    expect(CART_ADD_POINTS).toBe(10);
  });
});

describe('cart service', () => {
  let db: Db;
  beforeEach(() => {
    db = createEmptyDb();
    insertUser(db, { id: 1 });
  });

  it('[12] debe revertir la línea si falla la inserción en el ledger', () => {
    const p = insertProduct(db, { stock: 5 });
    const repo = createCartRepository(db);
    const failing = {
      ...repo,
      awardCartAdd: () => {
        throw new Error('ledger down');
      },
    };
    const service = createCartService(db, failing);
    expect(() => service.addItem(1, { productId: p, quantity: 2 })).toThrow('ledger down');
    expect(db.prepare('SELECT COUNT(*) AS n FROM cart_items').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT points_balance AS b FROM users WHERE id = 1').get()).toEqual({ b: 0 });
  });

  it('debe responder 500 uniforme sin fugas si el servicio falla de forma inesperada', async () => {
    const p = insertProduct(db);
    const repo = createCartRepository(db);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Falla inyectada en el repositorio real vía una tabla rota: el SQL no debe filtrarse.
    db.exec('DROP TRIGGER trg_points_ledger_balance');
    db.exec('ALTER TABLE points_ledger RENAME TO points_ledger_x');
    const app = createApp({ db });
    const res = await request(app).post('/api/cart/items').set('X-User-Id', '1').send({ productId: p });
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/points_ledger|SQLITE|at .*\.ts/i);
    expect(repo).toBeDefined();
  });
});
