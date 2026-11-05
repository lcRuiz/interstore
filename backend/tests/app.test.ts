import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/errors/error-handler.js';
import { withValidation } from '../src/middleware/validate.js';
import { createTestApp } from './helpers.js';

describe('infraestructura de la API', () => {
  it('GET /api/health responde ok', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' } });
  });

  it('ruta inexistente → 404 con formato de error estándar', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'ROUTE_NOT_FOUND' });
  });

  it('JSON malformado → 400 INVALID_JSON', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/me').set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('usuario actual (X-User-Id)', () => {
  it('sin header → 401 MISSING_USER', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_USER');
  });

  it('header inválido → 400 INVALID_USER_ID', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/me').set('X-User-Id', 'abc');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_USER_ID');
  });

  it('usuario inexistente → 401 UNKNOWN_USER', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/me').set('X-User-Id', '999');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNKNOWN_USER');
  });

  it('usuario válido → perfil con saldo de puntos', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/me').set('X-User-Id', '1');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 1, name: 'Ana Demo', pointsBalance: 0 });
  });
});

describe('withValidation', () => {
  const app = express();
  app.use(express.json());
  app.post(
    '/items/:id',
    withValidation(
      {
        params: z.object({ id: z.coerce.number().int().positive() }),
        query: z.object({ dryRun: z.enum(['true', 'false']).optional() }),
        body: z.object({ quantity: z.number().int().min(1) }),
      },
      ({ params, body }, _req, res) => {
        res.json({ data: { id: params.id, quantity: body.quantity } });
      },
    ),
  );
  app.use(errorHandler);

  it('entrega los datos parseados y tipados', async () => {
    const res = await request(app).post('/items/7').send({ quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 7, quantity: 2 });
  });

  it('reporta todos los problemas con su ubicación', async () => {
    const res = await request(app).post('/items/-1?dryRun=maybe').send({ quantity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const locations = res.body.error.details.map((d: { location: string }) => d.location);
    expect(locations).toEqual(['params', 'query', 'body']);
  });
});

describe('seed', () => {
  it('carga 40 productos en 5 categorías y es idempotente', async () => {
    const { db } = createTestApp();
    const { seed } = await import('../src/db/seed.js');
    seed(db);
    const row = db.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT category) AS c FROM products').get();
    expect(row).toEqual({ n: 40, c: 5 });
  });
});
