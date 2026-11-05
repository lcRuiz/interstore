import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../src/db/connection.js';
import { createEmptyApp, insertCategory, insertProduct } from './factories.js';

let app: Express;
let db: Db;

const get = (path: string) => request(app).get(path).set('X-User-Id', '1');
/** GET que exige 200 antes de leer el cuerpo: el fallo es de aserción de status, no un TypeError. */
const getOk = async (path: string) => {
  const res = await get(path);
  expect(res.status, `GET ${path}`).toBe(200);
  return res;
};
const listIds = (body: { data: Array<{ id: number }> }) => body.data.map((p) => p.id);

beforeEach(() => {
  ({ app, db } = createEmptyApp());
});

/** 15 productos: 10 de "ropa" (R01..R10) y 5 de "calzado" (C01..C05), creados en ese orden. */
function seedCatalog(): { ropa: number[]; calzado: number[] } {
  const ropaCat = insertCategory(db, { slug: 'ropa', name: 'Ropa' });
  const calzadoCat = insertCategory(db, { slug: 'calzado', name: 'Calzado' });
  const pad = (n: number) => String(n).padStart(2, '0');
  const ropa = Array.from({ length: 10 }, (_, i) =>
    insertProduct(db, {
      categoryId: ropaCat,
      name: `R${pad(i + 1)}`,
      price: 100_000 + i * 1000,
      createdAt: `2026-01-${pad(i + 1)}T00:00:00.000Z`,
    }),
  );
  const calzado = Array.from({ length: 5 }, (_, i) =>
    insertProduct(db, {
      categoryId: calzadoCat,
      name: `C${pad(i + 1)}`,
      price: 500_000 + i * 1000,
      createdAt: `2026-02-${pad(i + 1)}T00:00:00.000Z`,
    }),
  );
  return { ropa, calzado };
}

describe('GET /api/products › autenticación', () => {
  it('debe responder 401 MISSING_USER cuando falta X-User-Id', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_USER');
  });

  it('debe responder 401 UNKNOWN_USER cuando el usuario no existe', async () => {
    const res = await request(app).get('/api/products').set('X-User-Id', '999');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNKNOWN_USER');
  });
});

describe('GET /api/products › camino feliz y DTO', () => {
  it('debe devolver data y meta con los valores por defecto cuando no hay query', async () => {
    seedCatalog();
    const res = await get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 12, total: 15, totalPages: 2 });
  });

  it('debe devolver el DTO exacto sin columnas internas cuando lista', async () => {
    const cat = insertCategory(db, { slug: 'calzado', name: 'Calzado' });
    const id = insertProduct(db, {
      categoryId: cat,
      name: 'Andes Runner',
      price: 2_490_000,
      stock: 0,
      pointsMultiplier: 2,
      imageUrl: 'https://picsum.photos/seed/store-1/480/480',
    });

    const res = await getOk('/api/products');

    expect(res.body.data).toEqual([
      {
        id,
        name: 'Andes Runner',
        price: 2_490_000,
        imageUrl: 'https://picsum.photos/seed/store-1/480/480',
        stock: 0,
        pointsMultiplier: 2,
        category: { slug: 'calzado', name: 'Calzado' },
      },
    ]);
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/search_?name|category_?id|created_?at/i);
  });

  it('debe incluir los productos agotados con stock 0 cuando lista', async () => {
    insertProduct(db, { stock: 0 });
    const res = await getOk('/api/products');
    expect(res.body.data[0].stock).toBe(0);
  });

  it('debe ignorar parámetros de query desconocidos cuando los recibe', async () => {
    seedCatalog();
    const base = await get('/api/products?sort=price');
    const extra = await get('/api/products?sort=price&userId=2&foo=bar&role=admin');
    expect(extra.status).toBe(200);
    expect(extra.body).toEqual(base.body);
  });

  it('no debe exponer rutas de escritura cuando se intenta crear un producto (mass assignment)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('X-User-Id', '1')
      .send({ id: 1, name: 'X', price: 1, pointsBalance: 999 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('GET /api/products › paginación', () => {
  beforeEach(() => {
    seedCatalog();
  });

  it('debe devolver el resto en la segunda página cuando page=2', async () => {
    const res = await get('/api/products?page=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toEqual({ page: 2, pageSize: 12, total: 15, totalPages: 2 });
  });

  it('debe aceptar pageSize=50 y pageSize=1 cuando están en los límites', async () => {
    expect((await getOk('/api/products?pageSize=50')).body.data).toHaveLength(15);
    const one = await getOk('/api/products?pageSize=1');
    expect(one.body.data).toHaveLength(1);
    expect(one.body.meta).toMatchObject({ pageSize: 1, total: 15, totalPages: 15 });
  });

  it.each(['pageSize=51', 'pageSize=0', 'pageSize=-5', 'pageSize=abc', 'pageSize=1.5', 'pageSize=', 'pageSize=10&pageSize=20'])(
    'debe responder 400 VALIDATION_ERROR cuando la query es %s',
    async (qs) => {
      const res = await get(`/api/products?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0]).toMatchObject({ location: 'query', path: 'pageSize' });
    },
  );

  it.each(['page=0', 'page=-1', 'page=abc', 'page=1.5', 'page=', 'page=1000001', 'page=99999999999999999999', 'page=1e21'])(
    'debe responder 400 VALIDATION_ERROR cuando la query es %s',
    async (qs) => {
      const res = await get(`/api/products?${qs}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0]).toMatchObject({ location: 'query', path: 'page' });
    },
  );

  it('debe responder 200 con data vacío y meta coherente cuando la página está fuera de rango', async () => {
    const res = await get('/api/products?page=99');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ page: 99, pageSize: 12, total: 15, totalPages: 2 });
  });

  it('debe responder 200 con data vacío cuando page es el máximo permitido', async () => {
    const res = await get('/api/products?page=1000000&pageSize=50');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('debe responder 200 con data vacío, total 0 y totalPages 0 cuando no hay productos', async () => {
    db.exec('DELETE FROM products');
    const res = await get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } });
  });

  it('no debe repetir ni omitir productos cuando recorre todas las páginas', async () => {
    const seen: number[] = [];
    for (const page of [1, 2, 3, 4]) {
      seen.push(...listIds((await getOk(`/api/products?pageSize=4&page=${page}&sort=price`)).body));
    }
    expect(new Set(seen).size).toBe(15);
    expect(seen).toHaveLength(15);
  });
});

describe('GET /api/products › filtro category', () => {
  beforeEach(() => {
    seedCatalog();
  });

  it('debe devolver solo los productos de la categoría y meta con su total cuando filtra por slug', async () => {
    const res = await get('/api/products?category=calzado');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data.every((p: { category: { slug: string } }) => p.category.slug === 'calzado')).toBe(true);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 12, total: 5, totalPages: 1 });
  });

  it('debe responder 200 con data vacío y total 0 cuando la categoría no existe (decisión S1)', async () => {
    const res = await get('/api/products?category=no-existe');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 } });
  });

  it.each(['Ropa', "ropa'--", 'ropa;drop', 'ro pa', 'x'.repeat(51), 'a&category=b'])(
    'debe responder 400 VALIDATION_ERROR cuando el slug %s no tiene formato válido',
    async (slug) => {
      const res = await get(`/api/products?category=${encodeURIComponent(slug)}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('debe responder 400 cuando category llega repetido', async () => {
    const res = await get('/api/products?category=ropa&category=calzado');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/products › búsqueda q', () => {
  it('debe encontrar sin distinguir mayúsculas ni tildes cuando q difiere en ellas', async () => {
    insertProduct(db, { name: 'Calcetín Merino', searchName: 'calcetin merino' });
    insertProduct(db, { name: 'Gorra' });

    for (const q of ['CALCETIN', 'calcetín', 'Calcetín MERINO']) {
      const res = await getOk(`/api/products?q=${encodeURIComponent(q)}`);
      expect(res.body.data.map((p: { name: string }) => p.name), q).toEqual(['Calcetín Merino']);
      expect(res.body.meta.total).toBe(1);
    }
  });

  it('debe tratar %, _ y \\ como literales cuando q los contiene', async () => {
    insertProduct(db, { name: 'Oferta 50% off' });
    insertProduct(db, { name: 'Oferta 50 off' });
    insertProduct(db, { name: 'snake_case' });
    insertProduct(db, { name: 'snakeXcase' });
    insertProduct(db, { name: 'ruta\\segura' });

    const names = async (q: string) =>
      (await getOk(`/api/products?q=${encodeURIComponent(q)}`)).body.data.map((p: { name: string }) => p.name);
    expect(await names('%')).toEqual(['Oferta 50% off']);
    expect(await names('_')).toEqual(['snake_case']);
    expect(await names('\\')).toEqual(['ruta\\segura']);
  });

  it('debe aceptar q de exactamente 80 caracteres y rechazar 81 con 400', async () => {
    expect((await get(`/api/products?q=${'a'.repeat(80)}`)).status).toBe(200);
    const res = await get(`/api/products?q=${'a'.repeat(81)}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0]).toMatchObject({ location: 'query', path: 'q' });
  });

  it('debe tratar q solo con espacios como ausente cuando se recorta', async () => {
    insertProduct(db);
    insertProduct(db);
    const res = await get('/api/products?q=%20%20%20');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
  });

  it('debe responder 400 cuando q llega repetido', async () => {
    const res = await get('/api/products?q=a&q=b');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it("debe devolver vacío sin error cuando q intenta inyectar SQL (' OR 1=1 --)", async () => {
    insertProduct(db, { name: 'Camiseta' });
    const res = await get(`/api/products?q=${encodeURIComponent("' OR 1=1 --")}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });
});

describe('GET /api/products › orden sort', () => {
  it('debe ordenar por defecto del más reciente al más antiguo (decisión S2)', async () => {
    const { ropa, calzado } = seedCatalog();
    const res = await getOk('/api/products?pageSize=50');
    expect(listIds(res.body)).toEqual([...calzado].reverse().concat([...ropa].reverse()));
  });

  it('debe ordenar por nombre ignorando tildes y desempatar por id cuando sort=name', async () => {
    const zapato = insertProduct(db, { name: 'Zapato', searchName: 'zapato' });
    const arbol = insertProduct(db, { name: 'Árbol', searchName: 'arbol' });
    const banana1 = insertProduct(db, { name: 'Banana', searchName: 'banana' });
    const banana2 = insertProduct(db, { name: 'Banana', searchName: 'banana' });
    const res = await getOk('/api/products?sort=name');
    expect(listIds(res.body)).toEqual([arbol, banana1, banana2, zapato]);
  });

  it('debe ordenar por precio ascendente y desempatar por id cuando sort=price', async () => {
    const caro = insertProduct(db, { price: 90_000 });
    const barato1 = insertProduct(db, { price: 10_000 });
    const barato2 = insertProduct(db, { price: 10_000 });
    const res = await getOk('/api/products?sort=price');
    expect(listIds(res.body)).toEqual([barato1, barato2, caro]);
  });

  it('debe ordenar del más reciente al más antiguo y desempatar por id desc cuando sort=newest', async () => {
    const a = insertProduct(db, { createdAt: '2026-03-01T00:00:00.000Z' });
    const b = insertProduct(db, { createdAt: '2026-03-01T00:00:00.000Z' });
    const viejo = insertProduct(db, { createdAt: '2026-01-01T00:00:00.000Z' });
    const res = await getOk('/api/products?sort=newest');
    expect(listIds(res.body)).toEqual([b, a, viejo]);
  });

  it.each([
    ['rating'],
    ['NAME'],
    ['name;DROP TABLE products'],
    ["name'--"],
    ['name,price'],
    ['(SELECT 1)'],
    ['__proto__'],
    [''],
  ])('debe responder 400 VALIDATION_ERROR cuando sort=%s no está en la lista blanca', async (sort) => {
    insertProduct(db);
    const res = await get(`/api/products?sort=${encodeURIComponent(sort)}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0]).toMatchObject({ location: 'query', path: 'sort' });
    // La tabla sigue intacta tras el intento de inyección.
    expect(db.prepare('SELECT COUNT(*) AS n FROM products').get()).toEqual({ n: 1 });
  });

  it('debe responder 400 cuando sort llega repetido', async () => {
    const res = await get('/api/products?sort=name&sort=price');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products › combinación de filtros', () => {
  it('debe aplicar categoría, búsqueda, orden y paginación a la vez con meta coherente', async () => {
    const cat = insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    const otra = insertCategory(db, { slug: 'calzado', name: 'Calzado' });
    const merino = [30_000, 10_000, 20_000].map((price) =>
      insertProduct(db, { categoryId: cat, name: `Merino ${price}`, price }),
    );
    insertProduct(db, { categoryId: cat, name: 'Algodón', price: 1_000 });
    insertProduct(db, { categoryId: otra, name: 'Merino Runner', price: 5_000 });

    const res = await get('/api/products?category=ropa&q=MERINO&sort=price&page=2&pageSize=2');

    expect(res.status).toBe(200);
    expect(listIds(res.body)).toEqual([merino[0]]);
    expect(res.body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });
});

describe('GET /api/products/:id', () => {
  it('debe responder 200 con el DTO cuando el producto existe', async () => {
    const cat = insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    const id = insertProduct(db, { categoryId: cat, name: 'Sudadera Merino', price: 1_890_000, pointsMultiplier: 1 });

    const res = await get(`/api/products/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        id,
        name: 'Sudadera Merino',
        price: 1_890_000,
        imageUrl: expect.stringMatching(/^https:\/\//),
        stock: 5,
        pointsMultiplier: 1,
        category: { slug: 'ropa', name: 'Ropa' },
      },
    });
  });

  it('debe responder 404 PRODUCT_NOT_FOUND cuando el id no existe', async () => {
    const res = await get('/api/products/9999');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it.each(['abc', '0', '-1', '1.5', '1e3', '0x10', '%201', '007', '99999999999999999999', '1;DROP TABLE products'])(
    'debe responder 400 VALIDATION_ERROR cuando el id es "%s"',
    async (id) => {
      const res = await get(`/api/products/${encodeURIComponent(id)}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details[0]).toMatchObject({ location: 'params', path: 'id' });
    },
  );

  it('debe responder 401 MISSING_USER cuando falta X-User-Id', async () => {
    const id = insertProduct(db);
    const res = await request(app).get(`/api/products/${id}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_USER');
  });
});

describe('GET /api/categories', () => {
  it('debe responder 200 con { slug, name } ordenado por nombre y sin id cuando hay categorías', async () => {
    insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    insertCategory(db, { slug: 'accesorios', name: 'Accesorios' });
    insertCategory(db, { slug: 'calzado', name: 'Calzado' });

    const res = await get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: [
        { slug: 'accesorios', name: 'Accesorios' },
        { slug: 'calzado', name: 'Calzado' },
        { slug: 'ropa', name: 'Ropa' },
      ],
    });
  });

  it('debe responder 200 con data vacío cuando no hay categorías', async () => {
    const res = await get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [] });
  });

  it('debe responder 401 MISSING_USER cuando falta X-User-Id', async () => {
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MISSING_USER');
  });
});

describe('errores inesperados › sin fugas', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(['/api/products', '/api/products/1', '/api/categories'])(
    'debe responder 500 INTERNAL_ERROR genérico, sin stack ni texto SQL, cuando falla la base en GET %s',
    async (path) => {
      db.exec('DROP TABLE products');
      db.exec('DROP TABLE categories');

      const res = await get(path);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
      expect(JSON.stringify(res.body)).not.toMatch(/sqlite|no such table|products|categories|stack|\.ts|node_modules/i);
    },
  );
});
