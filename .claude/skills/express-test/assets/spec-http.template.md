# Plantilla: spec de integración HTTP (supertest)

Adapta imports, rutas y formato de error al repo (aquí: ESM con extensiones `.js`, error `{ error: { code, message, details? } }`, usuario por `X-User-Id`).

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import type { Db } from '../src/db/connection.js';
import { createTestApp } from './helpers.js';
import { insertProduct, makeProduct } from './factories.js';

describe('GET /api/<recurso>', () => {
  let app: Express;
  let db: Db;

  beforeEach(() => {
    ({ app, db } = createTestApp());
  });

  it('debe devolver la primera página ordenada por id cuando no hay filtros', async () => {
    insertProduct(db, makeProduct({ name: 'A' }));
    const res = await request(app).get('/api/<recurso>').set('X-User-Id', '1');
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1 });
  });

  it('debe responder 400 VALIDATION_ERROR cuando pageSize supera el máximo', async () => {
    const res = await request(app).get('/api/<recurso>').query({ pageSize: 10_000 }).set('X-User-Id', '1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('debe responder 401 cuando falta la identidad del usuario', async () => {
    const res = await request(app).get('/api/<recurso>');
    expect(res.status).toBe(401);
  });

  it('debe responder 404 cuando el recurso pertenece a otro usuario', async () => { /* IDOR */ });

  it('no debe persistir campos no permitidos cuando el body trae campos extra', async () => { /* mass assignment */ });

  it('debe responder 500 sin detalles internos cuando falla el repositorio', async () => { /* fuga */ });
});
```

## Esqueleto de ruta (RED)
```ts
router.get('/', () => {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Not implemented');
});
```
