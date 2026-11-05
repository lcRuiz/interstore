import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '../src/db/connection.js';
import { createProductsRepository, type ProductsRepository } from '../src/modules/products/products.repository.js';
import type { ListProductsQuery } from '../src/modules/products/products.schemas.js';
import { createEmptyDb, insertCategory, insertProduct } from './factories.js';

let db: Db;
let repo: ProductsRepository;

const query = (overrides: Partial<ListProductsQuery> = {}): ListProductsQuery => ({
  page: 1,
  pageSize: 12,
  sort: 'newest',
  ...overrides,
});
const names = (overrides: Partial<ListProductsQuery> = {}) => repo.list(query(overrides)).rows.map((r) => r.name);

beforeEach(() => {
  db = createEmptyDb();
  repo = createProductsRepository(db);
});

describe('ProductsRepository.list › forma de la fila', () => {
  it('debe devolver solo las columnas públicas con la categoría aplanada cuando lista', () => {
    const ropa = insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    const id = insertProduct(db, {
      categoryId: ropa,
      name: 'Sudadera',
      price: 189_000,
      stock: 3,
      pointsMultiplier: 2,
      imageUrl: 'https://picsum.photos/seed/x/480/480',
    });

    const { rows, total } = repo.list(query());

    expect(total).toBe(1);
    expect(rows).toEqual([
      {
        id,
        name: 'Sudadera',
        price: 189_000,
        imageUrl: 'https://picsum.photos/seed/x/480/480',
        stock: 3,
        pointsMultiplier: 2,
        categorySlug: 'ropa',
        categoryName: 'Ropa',
      },
    ]);
  });

  it('debe devolver lista vacía y total 0 cuando no hay productos', () => {
    expect(repo.list(query())).toEqual({ rows: [], total: 0 });
  });
});

describe('ProductsRepository.list › paginación', () => {
  beforeEach(() => {
    const category = insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    for (let i = 1; i <= 25; i += 1) insertProduct(db, { categoryId: category, name: `P${String(i).padStart(2, '0')}` });
  });

  it('debe respetar LIMIT y OFFSET y devolver el total completo cuando pagina', () => {
    const second = repo.list(query({ page: 2, pageSize: 10, sort: 'name' }));
    expect(second.rows.map((r) => r.name)).toEqual(Array.from({ length: 10 }, (_, i) => `P${String(i + 11).padStart(2, '0')}`));
    expect(second.total).toBe(25);
  });

  it('debe devolver la última página incompleta cuando el resto no llena la página', () => {
    expect(names({ page: 3, pageSize: 10, sort: 'name' })).toEqual(['P21', 'P22', 'P23', 'P24', 'P25']);
  });

  it('debe devolver filas vacías pero el total real cuando la página está fuera de rango', () => {
    expect(repo.list(query({ page: 99, pageSize: 10 }))).toEqual({ rows: [], total: 25 });
  });

  it('debe devolver la página más grande posible sin error cuando page es el máximo permitido', () => {
    expect(repo.list(query({ page: 1_000_000, pageSize: 50 })).rows).toEqual([]);
  });
});

describe('ProductsRepository.list › filtro por categoría', () => {
  beforeEach(() => {
    const ropa = insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    const calzado = insertCategory(db, { slug: 'calzado', name: 'Calzado' });
    insertProduct(db, { categoryId: ropa, name: 'Camiseta' });
    insertProduct(db, { categoryId: ropa, name: 'Chaqueta' });
    insertProduct(db, { categoryId: calzado, name: 'Zapatilla' });
  });

  it('debe devolver solo los productos de la categoría y su total cuando filtra por slug', () => {
    const { rows, total } = repo.list(query({ category: 'ropa', sort: 'name' }));
    expect(rows.map((r) => r.name)).toEqual(['Camiseta', 'Chaqueta']);
    expect(total).toBe(2);
  });

  it('debe devolver vacío con total 0 cuando el slug no existe', () => {
    expect(repo.list(query({ category: 'no-existe' }))).toEqual({ rows: [], total: 0 });
  });

  it('debe contar el total con el mismo WHERE cuando combina categoría y búsqueda', () => {
    const { rows, total } = repo.list(query({ category: 'ropa', q: 'cami', pageSize: 1 }));
    expect(rows.map((r) => r.name)).toEqual(['Camiseta']);
    expect(total).toBe(1);
  });
});

describe('ProductsRepository.list › búsqueda q', () => {
  it('debe ignorar mayúsculas y tildes cuando q y el nombre difieren en ellas', () => {
    insertProduct(db, { name: 'Camiseta Algodón Orgánico', searchName: 'camiseta algodon organico' });
    insertProduct(db, { name: 'Pantalón', searchName: 'pantalon' });

    expect(names({ q: 'ALGODÓN' })).toEqual(['Camiseta Algodón Orgánico']);
    expect(names({ q: 'algodon' })).toEqual(['Camiseta Algodón Orgánico']);
    expect(names({ q: 'PANTALON' })).toEqual(['Pantalón']);
    expect(names({ q: 'pantalón' })).toEqual(['Pantalón']);
  });

  it('debe buscar subcadenas en cualquier posición cuando q es parte del nombre', () => {
    insertProduct(db, { name: 'Sudadera Merino' });
    expect(names({ q: 'dera mer' })).toEqual(['Sudadera Merino']);
  });

  it('debe tratar % como literal cuando q contiene %', () => {
    insertProduct(db, { name: 'Oferta 50% off' });
    insertProduct(db, { name: 'Oferta 50 off' });
    expect(names({ q: '%' })).toEqual(['Oferta 50% off']);
    expect(names({ q: '50% off' })).toEqual(['Oferta 50% off']);
  });

  it('debe tratar _ como literal cuando q contiene _', () => {
    insertProduct(db, { name: 'snake_case' });
    insertProduct(db, { name: 'snakeXcase' });
    expect(names({ q: 'snake_case' })).toEqual(['snake_case']);
    expect(names({ q: '_' })).toEqual(['snake_case']);
  });

  it('debe tratar \\ como literal cuando q contiene una barra invertida', () => {
    insertProduct(db, { name: 'ruta\\segura' });
    insertProduct(db, { name: 'ruta segura' });
    expect(names({ q: '\\' })).toEqual(['ruta\\segura']);
    expect(names({ q: 'ruta\\' })).toEqual(['ruta\\segura']);
  });

  it('debe tratar la comilla y el SQL como datos cuando q intenta inyectar', () => {
    insertProduct(db, { name: "O'Brien Boots" });
    insertProduct(db, { name: 'Otro' });
    expect(names({ q: "o'brien" })).toEqual(["O'Brien Boots"]);
    expect(names({ q: "' OR 1=1 --" })).toEqual([]);
    expect(names({ q: "'; DROP TABLE products; --" })).toEqual([]);
    expect(repo.list(query()).total).toBe(2);
  });

  it('debe devolver todos los productos cuando q es una cadena vacía o undefined', () => {
    insertProduct(db, { name: 'A' });
    insertProduct(db, { name: 'B' });
    expect(repo.list(query({ q: '' })).total).toBe(2);
    expect(repo.list(query()).total).toBe(2);
  });
});

describe('ProductsRepository.list › orden', () => {
  it('debe ordenar por nombre normalizado y desempatar por id ascendente cuando sort=name', () => {
    const zapato = insertProduct(db, { name: 'Zapato', searchName: 'zapato' });
    const arbol = insertProduct(db, { name: 'Árbol', searchName: 'arbol' });
    const banana1 = insertProduct(db, { name: 'Banana', searchName: 'banana' });
    const banana2 = insertProduct(db, { name: 'banana', searchName: 'banana' });

    const ids = repo.list(query({ sort: 'name' })).rows.map((r) => r.id);
    expect(ids).toEqual([arbol, banana1, banana2, zapato]);
  });

  it('debe ordenar por precio ascendente y desempatar por id ascendente cuando sort=price', () => {
    const caro = insertProduct(db, { price: 90_000 });
    const barato1 = insertProduct(db, { price: 10_000 });
    const medio = insertProduct(db, { price: 50_000 });
    const barato2 = insertProduct(db, { price: 10_000 });

    expect(repo.list(query({ sort: 'price' })).rows.map((r) => r.id)).toEqual([barato1, barato2, medio, caro]);
  });

  it('debe ordenar del más reciente al más antiguo y desempatar por id descendente cuando sort=newest', () => {
    const viejo = insertProduct(db, { createdAt: '2026-01-01T00:00:00.000Z' });
    const nuevo1 = insertProduct(db, { createdAt: '2026-03-01T00:00:00.000Z' });
    const medio = insertProduct(db, { createdAt: '2026-02-01T00:00:00.000Z' });
    const nuevo2 = insertProduct(db, { createdAt: '2026-03-01T00:00:00.000Z' });

    expect(repo.list(query({ sort: 'newest' })).rows.map((r) => r.id)).toEqual([nuevo2, nuevo1, medio, viejo]);
  });

  it('debe mantener el orden estable entre páginas cuando hay empates', () => {
    for (let i = 0; i < 6; i += 1) insertProduct(db, { name: 'Igual', price: 1000 });
    const p1 = repo.list(query({ sort: 'price', pageSize: 3, page: 1 })).rows.map((r) => r.id);
    const p2 = repo.list(query({ sort: 'price', pageSize: 3, page: 2 })).rows.map((r) => r.id);
    expect(new Set([...p1, ...p2]).size).toBe(6);
    expect([...p1, ...p2]).toEqual([...p1, ...p2].sort((a, b) => a - b));
  });
});

describe('ProductsRepository.list › desempate por id independiente del plan de consulta', () => {
  it('debe desempatar por id ascendente aunque los ids se intercalen entre categorías', () => {
    const a = insertCategory(db, { slug: 'a', name: 'A' });
    const b = insertCategory(db, { slug: 'b', name: 'B' });
    const ids = [a, b, a, b, a, b].map((categoryId) =>
      insertProduct(db, { categoryId, name: 'Igual', searchName: 'igual', price: 5000 }),
    );
    expect(repo.list(query({ sort: 'price' })).rows.map((r) => r.id)).toEqual(ids);
    expect(repo.list(query({ sort: 'name' })).rows.map((r) => r.id)).toEqual(ids);
    expect(repo.list(query({ sort: 'newest', pageSize: 50 })).rows.map((r) => r.id)).toEqual(
      [...ids].sort((x, y) => y - x),
    );
  });
});

describe('ProductsRepository.findById', () => {
  it('debe devolver el producto con su categoría cuando existe', () => {
    const cat = insertCategory(db, { slug: 'calzado', name: 'Calzado' });
    const id = insertProduct(db, { categoryId: cat, name: 'Andes Runner', price: 2_490_000, pointsMultiplier: 2 });
    expect(repo.findById(id)).toMatchObject({
      id,
      name: 'Andes Runner',
      price: 2_490_000,
      pointsMultiplier: 2,
      categorySlug: 'calzado',
      categoryName: 'Calzado',
    });
  });

  it('debe devolver undefined cuando el id no existe', () => {
    expect(repo.findById(9999)).toBeUndefined();
  });

  it('no debe exponer search_name ni category_id cuando devuelve el producto', () => {
    const id = insertProduct(db);
    const found = repo.findById(id) as object;
    expect(Object.keys(found).sort()).toEqual(
      ['categoryName', 'categorySlug', 'id', 'imageUrl', 'name', 'pointsMultiplier', 'price', 'stock'].sort(),
    );
  });
});

describe('ProductsRepository.listCategories', () => {
  it('debe devolver { slug, name } ordenado por nombre cuando hay categorías', () => {
    insertCategory(db, { slug: 'ropa', name: 'Ropa' });
    insertCategory(db, { slug: 'accesorios', name: 'Accesorios' });
    insertCategory(db, { slug: 'calzado', name: 'Calzado' });
    expect(repo.listCategories()).toEqual([
      { slug: 'accesorios', name: 'Accesorios' },
      { slug: 'calzado', name: 'Calzado' },
      { slug: 'ropa', name: 'Ropa' },
    ]);
  });

  it('debe devolver lista vacía cuando no hay categorías', () => {
    expect(repo.listCategories()).toEqual([]);
  });
});
