import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase, type Db } from '../src/db/connection.js';
import { migrate, migrations, type Migration } from '../src/db/migrate.js';

const userVersion = (db: Db) => (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
const tableNames = (db: Db) =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
const rawDb = () => new DatabaseSync(':memory:');
const migration = (version: number, sql: string): Migration => ({ version, name: `000${version}_test`, sql });

describe('migrate()', () => {
  it('debe aplicar las migraciones desde cero y dejar user_version en la última versión', () => {
    const db = rawDb();
    migrate(db);
    expect(userVersion(db)).toBe(1);
    expect(migrations.map((m) => m.version)).toEqual([1]);
  });

  it('debe ser idempotente cuando se ejecuta dos veces', () => {
    const db = rawDb();
    migrate(db);
    expect(() => migrate(db)).not.toThrow();
    expect(userVersion(db)).toBe(1);
  });

  it('debe aplicar solo las migraciones pendientes cuando la base ya está en una versión', () => {
    const db = rawDb();
    const m1 = migration(1, 'CREATE TABLE a (id INTEGER)');
    const m2 = migration(2, 'CREATE TABLE b (id INTEGER)');
    migrate(db, [m1]);
    expect(userVersion(db)).toBe(1);
    // m1 (CREATE TABLE sin IF NOT EXISTS) fallaría si se reaplicara.
    expect(() => migrate(db, [m1, m2])).not.toThrow();
    expect(userVersion(db)).toBe(2);
    expect(tableNames(db)).toEqual(['a', 'b']);
  });

  it('debe revertir toda la migración y conservar user_version cuando una sentencia falla', () => {
    const db = rawDb();
    const ok = migration(1, 'CREATE TABLE a (id INTEGER)');
    const bad = migration(2, 'CREATE TABLE b (id INTEGER); INSERT INTO tabla_que_no_existe VALUES (1);');
    expect(() => migrate(db, [ok, bad])).toThrow();
    expect(userVersion(db)).toBe(1);
    expect(tableNames(db)).toEqual(['a']);
    expect(db.isTransaction).toBe(false);
  });

  it('debe rechazar la base cuando su user_version es mayor que la última migración conocida', () => {
    const db = rawDb();
    db.exec('PRAGMA user_version = 99');
    expect(() => migrate(db)).toThrow(/user_version/);
  });

  it.each([
    ['no empiezan en 1', [migration(2, 'SELECT 1')]],
    ['tienen un hueco', [migration(1, 'SELECT 1'), migration(3, 'SELECT 1')]],
    ['repiten versión', [migration(1, 'SELECT 1'), migration(1, 'SELECT 2')]],
  ])('debe rechazar la lista cuando las versiones %s', (_caso, list) => {
    expect(() => migrate(rawDb(), list)).toThrow(/consecutiv/i);
  });
});

describe('openDatabase() con 0001_initial', () => {
  let db: Db;
  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  it('debe dejar user_version en 1 y foreign_keys activo cuando abre una base nueva', () => {
    expect(userVersion(db)).toBe(1);
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
  });

  it('debe crear las 8 tablas del modelo cuando abre una base nueva', () => {
    expect(tableNames(db)).toEqual([
      'cart_items',
      'categories',
      'favorites',
      'order_items',
      'orders',
      'points_ledger',
      'products',
      'users',
    ]);
  });

  it('debe crear todas las tablas STRICT y WITHOUT ROWID en las de clave compuesta', () => {
    const list = db.prepare('PRAGMA table_list').all() as unknown as Array<{ name: string; strict: number; wr: number }>;
    const app = list.filter((t) => !t.name.startsWith('sqlite_') && t.name !== 'temp');
    expect(app).toHaveLength(8);
    expect(app.every((t) => t.strict === 1)).toBe(true);
    const withoutRowid = app.filter((t) => t.wr === 1).map((t) => t.name).sort();
    expect(withoutRowid).toEqual(['cart_items', 'favorites', 'order_items']);
  });

  it('debe crear los índices de consultas reales y los 3 triggers del ledger', () => {
    const names = (type: string) =>
      db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name NOT LIKE ? ORDER BY name')
        .all(type, 'sqlite_%')
        .map((r) => r.name);
    expect(names('index')).toEqual(['idx_orders_user', 'idx_points_ledger_user', 'idx_products_category']);
    expect(names('trigger')).toEqual([
      'trg_points_ledger_balance',
      'trg_points_ledger_no_delete',
      'trg_points_ledger_no_update',
    ]);
  });
});

describe('openDatabase() sobre archivo', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'store-test-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('debe activar WAL, busy_timeout y foreign_keys cuando la base es un archivo', () => {
    const db = openDatabase(join(dir, 'a', 'test.db'));
    expect(db.prepare('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' });
    expect(db.prepare('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000 });
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    db.close();
  });

  it('debe conservar los datos y no reaplicar migraciones cuando reabre el archivo', () => {
    const path = join(dir, 'test.db');
    const first = openDatabase(path);
    first.prepare('INSERT INTO categories (slug, name) VALUES (?, ?)').run('ropa', 'Ropa');
    first.close();

    const second = openDatabase(path);
    expect(userVersion(second)).toBe(1);
    expect(second.prepare('SELECT slug FROM categories').all()).toEqual([{ slug: 'ropa' }]);
    second.close();
  });
});

describe('restricciones del modelo (ADR 0001)', () => {
  let db: Db;
  const addLedger = (userId: number, action: string, refId: number, points: number) =>
    db
      .prepare('INSERT INTO points_ledger (user_id, action, ref_id, points) VALUES (?, ?, ?, ?)')
      .run(userId, action, refId, points);
  const balance = (userId: number) =>
    (db.prepare('SELECT points_balance AS b FROM users WHERE id = ?').get(userId) as { b: number }).b;
  const addOrder = (userId: number, key: string, status = 'confirmed', total = 100_000) =>
    db
      .prepare('INSERT INTO orders (user_id, idempotency_key, status, total) VALUES (?, ?, ?, ?)')
      .run(userId, key, status, total);

  beforeEach(() => {
    db = openDatabase(':memory:');
    db.exec(`
      INSERT INTO categories (id, slug, name) VALUES (1, 'ropa', 'Ropa');
      INSERT INTO products (id, category_id, name, search_name, price, image_url, stock)
        VALUES (1, 1, 'Camiseta', 'camiseta', 50000, 'https://x.test/1', 5);
      INSERT INTO users (id, name) VALUES (1, 'Ana Test'), (2, 'Beto Test');
    `);
  });

  describe('products / categories / users', () => {
    const insertProduct = (overrides: Partial<Record<string, string | number>> = {}) => {
      const v = { category_id: 1, name: 'P', price: 1000, stock: 1, points_multiplier: 1, ...overrides };
      return db
        .prepare(
          `INSERT INTO products (category_id, name, search_name, price, image_url, stock, points_multiplier)
           VALUES (?, ?, 'p', ?, 'https://x.test/p', ?, ?)`,
        )
        .run(v.category_id, v.name, v.price, v.stock, v.points_multiplier);
    };

    it.each([
      ['stock negativo', { stock: -1 }],
      ['precio cero', { price: 0 }],
      ['multiplicador 3', { points_multiplier: 3 }],
      ['nombre vacío', { name: '' }],
      ['nombre de 121 caracteres', { name: 'x'.repeat(121) }],
    ])('debe rechazar el producto con CHECK cuando tiene %s', (_caso, overrides) => {
      expect(() => insertProduct(overrides)).toThrow(/CHECK constraint failed/);
    });

    it('debe rechazar el producto con FOREIGN KEY cuando la categoría no existe', () => {
      expect(() => insertProduct({ category_id: 999 })).toThrow(/FOREIGN KEY constraint failed/);
    });

    it('debe rechazar texto en una columna INTEGER cuando la tabla es STRICT', () => {
      expect(() => insertProduct({ price: 'abc' })).toThrow(/cannot store TEXT/);
    });

    it('debe rechazar la categoría con CHECK cuando el slug no empieza por [a-z0-9-]', () => {
      expect(() => db.prepare('INSERT INTO categories (slug, name) VALUES (?, ?)').run('Ropa2', 'Otra')).toThrow(
        /CHECK constraint failed/,
      );
    });

    it('debe rechazar la categoría con UNIQUE cuando el slug o el nombre se repiten', () => {
      const insert = db.prepare('INSERT INTO categories (slug, name) VALUES (?, ?)');
      expect(() => insert.run('ropa', 'Distinto')).toThrow(/UNIQUE constraint failed/);
      expect(() => insert.run('distinto', 'Ropa')).toThrow(/UNIQUE constraint failed/);
    });

    it('debe rechazar el usuario con CHECK cuando el saldo es negativo', () => {
      expect(() => db.prepare('INSERT INTO users (name, points_balance) VALUES (?, ?)').run('X', -1)).toThrow(
        /CHECK constraint failed/,
      );
    });
  });

  describe('points_ledger', () => {
    it('debe sumar los puntos al saldo del usuario cuando se inserta un movimiento (trigger)', () => {
      addLedger(1, 'CART_ADD', 1, 10);
      addLedger(1, 'FAVORITE_ADD', 1, 5);
      expect(balance(1)).toBe(15);
      expect(balance(2)).toBe(0);
    });

    it('debe restar del saldo cuando el movimiento es negativo y hay saldo suficiente', () => {
      addLedger(1, 'CART_ADD', 1, 10);
      addLedger(1, 'PURCHASE', 1, -4);
      expect(balance(1)).toBe(6);
    });

    it('debe abortar el movimiento y dejar saldo y ledger intactos cuando el saldo quedaría negativo', () => {
      addLedger(1, 'CART_ADD', 1, 10);
      expect(() => addLedger(1, 'PURCHASE', 1, -100)).toThrow(/CHECK constraint failed/);
      expect(balance(1)).toBe(10);
      expect(db.prepare('SELECT COUNT(*) AS n FROM points_ledger').get()).toEqual({ n: 1 });
    });

    it('debe rechazar UPDATE y DELETE cuando el ledger es de solo inserción', () => {
      addLedger(1, 'CART_ADD', 1, 10);
      expect(() => db.exec('UPDATE points_ledger SET points = 99')).toThrow(/append-only/);
      expect(() => db.exec('DELETE FROM points_ledger')).toThrow(/append-only/);
      expect(balance(1)).toBe(10);
    });

    it('debe rechazar con UNIQUE el mismo (usuario, acción, ref) sin cambiar el saldo', () => {
      addLedger(1, 'CART_ADD', 1, 10);
      expect(() => addLedger(1, 'CART_ADD', 1, 10)).toThrow(/UNIQUE constraint failed/);
      expect(balance(1)).toBe(10);
    });

    it('debe permitir la misma acción y ref cuando es otro usuario u otro ref', () => {
      addLedger(1, 'CART_ADD', 1, 10);
      expect(() => addLedger(2, 'CART_ADD', 1, 10)).not.toThrow();
      expect(() => addLedger(1, 'CART_ADD', 2, 10)).not.toThrow();
    });

    it.each([
      ['acción desconocida', 'REFUND', 10],
      ['puntos en cero', 'CART_ADD', 0],
    ])('debe rechazar con CHECK cuando hay %s', (_caso, action, points) => {
      expect(() => addLedger(1, action, 1, points)).toThrow(/CHECK constraint failed/);
    });

    it('debe rechazar con FOREIGN KEY cuando el usuario no existe', () => {
      expect(() => addLedger(999, 'CART_ADD', 1, 10)).toThrow(/FOREIGN KEY constraint failed/);
    });
  });

  describe('orders / order_items', () => {
    it('debe rechazar con UNIQUE la misma idempotency_key del mismo usuario y permitirla a otro', () => {
      addOrder(1, 'clave-12345678');
      expect(() => addOrder(1, 'clave-12345678')).toThrow(/UNIQUE constraint failed/);
      expect(() => addOrder(2, 'clave-12345678')).not.toThrow();
    });

    it.each([
      ['clave de 7 caracteres', 'abcdefg', 'confirmed', 100],
      ['clave de 65 caracteres', 'x'.repeat(65), 'confirmed', 100],
      ['estado desconocido', 'clave-12345678', 'shipped', 100],
      ['total en cero', 'clave-12345678', 'confirmed', 0],
    ])('debe rechazar el pedido con CHECK cuando tiene %s', (_caso, key, status, total) => {
      expect(() => addOrder(1, key, status, total)).toThrow(/CHECK constraint failed/);
    });

    it('debe borrar en cascada las líneas cuando se borra el pedido', () => {
      const orderId = Number(addOrder(1, 'clave-12345678').lastInsertRowid);
      db.prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, 1, ?, ?, ?)',
      ).run(orderId, 'Camiseta', 50_000, 2);
      db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);
      expect(db.prepare('SELECT COUNT(*) AS n FROM order_items').get()).toEqual({ n: 0 });
    });

    it('debe rechazar con UNIQUE el mismo producto dos veces en un pedido y cantidad cero con CHECK', () => {
      const orderId = Number(addOrder(1, 'clave-12345678').lastInsertRowid);
      const insert = db.prepare(
        'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, 1, ?, ?, ?)',
      );
      expect(() => insert.run(orderId, 'Camiseta', 50_000, 0)).toThrow(/CHECK constraint failed/);
      insert.run(orderId, 'Camiseta', 50_000, 1);
      expect(() => insert.run(orderId, 'Camiseta', 50_000, 1)).toThrow(/UNIQUE constraint failed/);
    });

    it('debe impedir borrar un usuario con pedidos (sin cascada) con FOREIGN KEY', () => {
      addOrder(1, 'clave-12345678');
      expect(() => db.prepare('DELETE FROM users WHERE id = 1').run()).toThrow(/FOREIGN KEY constraint failed/);
    });
  });

  describe('cart_items / favorites', () => {
    it.each([
      ['cantidad 0', 0],
      ['cantidad 100', 100],
    ])('debe rechazar el ítem del carrito con CHECK cuando tiene %s', (_caso, quantity) => {
      expect(() =>
        db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, 1, ?)').run(quantity),
      ).toThrow(/CHECK constraint failed/);
    });

    it('debe rechazar con UNIQUE el mismo producto dos veces en el carrito y en favoritos', () => {
      db.exec('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, 1, 2)');
      db.exec('INSERT INTO favorites (user_id, product_id) VALUES (1, 1)');
      expect(() => db.exec('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, 1, 3)')).toThrow(
        /UNIQUE constraint failed/,
      );
      expect(() => db.exec('INSERT INTO favorites (user_id, product_id) VALUES (1, 1)')).toThrow(
        /UNIQUE constraint failed/,
      );
    });

    it('debe borrar en cascada carrito y favoritos cuando se borra el usuario', () => {
      db.exec('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (2, 1, 2)');
      db.exec('INSERT INTO favorites (user_id, product_id) VALUES (2, 1)');
      db.exec('DELETE FROM users WHERE id = 2');
      expect(db.prepare('SELECT COUNT(*) AS n FROM cart_items').get()).toEqual({ n: 0 });
      expect(db.prepare('SELECT COUNT(*) AS n FROM favorites').get()).toEqual({ n: 0 });
    });

    it('debe impedir borrar un producto que está en un carrito con FOREIGN KEY', () => {
      db.exec('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (1, 1, 1)');
      expect(() => db.exec('DELETE FROM products WHERE id = 1')).toThrow(/FOREIGN KEY constraint failed/);
    });
  });
});
