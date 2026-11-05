import { beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../src/db/connection.js';
import { seed } from '../src/db/seed.js';

interface Row {
  name: string;
  search_name: string;
  price: number;
  stock: number;
  points_multiplier: number;
  image_url: string;
  slug: string;
}

let db: Db;
const productRows = () =>
  db
    .prepare(
      `SELECT p.name, p.search_name, p.price, p.stock, p.points_multiplier, p.image_url, c.slug
       FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id`,
    )
    .all() as unknown as Row[];
const byName = (name: string) => productRows().find((row) => row.name === name);

beforeEach(() => {
  db = openDatabase(':memory:');
  seed(db);
});

describe('seed', () => {
  it('debe cargar 40 productos y 3 categorías cuando la base está vacía', () => {
    expect(productRows()).toHaveLength(40);
    const slugs = db.prepare('SELECT slug FROM categories ORDER BY slug').all().map((r) => r.slug);
    expect(slugs).toEqual(['accesorios', 'calzado', 'ropa']);
  });

  it('debe dejar cada categoría con al menos un producto cuando carga el catálogo', () => {
    const counts = db
      .prepare('SELECT COUNT(*) AS n FROM categories c JOIN products p ON p.category_id = c.id GROUP BY c.id')
      .all()
      .map((r) => r.n as number);
    expect(counts).toHaveLength(3);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
  });

  it('debe cargar los 2 usuarios demo con saldo 0 cuando la base está vacía', () => {
    const users = db.prepare('SELECT id, name, points_balance AS pointsBalance FROM users ORDER BY id').all();
    expect(users).toEqual([
      { id: 1, name: 'Ana Demo', pointsBalance: 0 },
      { id: 2, name: 'Carlos Demo', pointsBalance: 0 },
    ]);
  });

  it('debe cargar los 12 productos del diseño con precio x1000 y categoría cuando siembra', () => {
    const expected: Array<[string, number, string, number]> = [
      ['Andes Runner', 2_490_000, 'calzado', 2],
      ['Sudadera Merino', 1_890_000, 'ropa', 1],
      ['Chaqueta Brisa', 3_290_000, 'ropa', 2],
      ['Mochila Diaria 22 L', 1_450_000, 'accesorios', 2],
      ['Camiseta Esencial', 590_000, 'ropa', 1],
      ['Chino Elástico', 1_290_000, 'ropa', 1],
      ['Lago Slip-on', 1_990_000, 'calzado', 1],
      ['Gorra Lona Encerada', 490_000, 'accesorios', 1],
      ['Calcetín Merino', 390_000, 'accesorios', 1],
      ['Botella Térmica', 620_000, 'accesorios', 1],
      ['Chamarra Valle', 3_890_000, 'ropa', 2],
      ['Short Trail 7"', 790_000, 'ropa', 1],
    ];
    for (const [name, price, slug, multiplier] of expected) {
      expect(byName(name), name).toMatchObject({ price, slug, points_multiplier: multiplier });
    }
  });

  it('debe dejar "Lago Slip-on" agotado (stock 0) y el resto de los de diseño con stock cuando siembra', () => {
    expect(byName('Lago Slip-on')?.stock).toBe(0);
    expect(byName('Andes Runner')?.stock).toBeGreaterThan(0);
    expect(byName('Sudadera Merino')?.stock).toBeGreaterThan(0);
  });

  it('debe calcular search_name en minúsculas y sin tildes cuando siembra', () => {
    expect(byName('Calcetín Merino')?.search_name).toBe('calcetin merino');
    expect(byName('Chino Elástico')?.search_name).toBe('chino elastico');
    for (const row of productRows()) {
      // Expectativa independiente de la función compartida.
      expect(row.search_name, row.name).toBe(row.name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());
    }
  });

  it('debe usar imágenes picsum, precios enteros positivos y multiplicador 1 o 2 cuando siembra', () => {
    for (const row of productRows()) {
      expect(row.image_url).toMatch(/^https:\/\/picsum\.photos\/seed\/[\w-]+\/\d+\/\d+$/);
      expect(Number.isInteger(row.price) && row.price > 0).toBe(true);
      expect([1, 2]).toContain(row.points_multiplier);
    }
  });

  it('debe asignar created_at distinto y creciente con el id cuando siembra', () => {
    const rows = db.prepare('SELECT id, created_at FROM products ORDER BY id').all() as unknown as Array<{
      id: number;
      created_at: string;
    }>;
    expect(new Set(rows.map((r) => r.created_at)).size).toBe(40);
    const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    expect(sorted.map((r) => r.id)).toEqual(rows.map((r) => r.id));
  });

  it('debe ser idempotente cuando se ejecuta dos veces', () => {
    seed(db);
    expect(productRows()).toHaveLength(40);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 2 });
    expect(db.prepare('SELECT COUNT(*) AS n FROM categories').get()).toEqual({ n: 3 });
  });
});
