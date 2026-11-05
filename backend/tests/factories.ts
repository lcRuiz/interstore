import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { openDatabase, type Db } from '../src/db/connection.js';

/**
 * Factories de datos 100 % sintéticos. Todas escriben con SQL directo sobre la
 * base `:memory:` (migrada con las migraciones reales) para no depender del
 * código bajo prueba (repositorio/servicio) al preparar los datos.
 */

let counter = 0;
const next = () => ++counter;

export interface ProductOverrides {
  categoryId?: number;
  name?: string;
  /** Por defecto `name.toLowerCase()`: pasa el valor normalizado a mano si el nombre lleva tildes. */
  searchName?: string;
  price?: number;
  imageUrl?: string;
  stock?: number;
  pointsMultiplier?: 1 | 2;
  createdAt?: string;
}

export function insertUser(db: Db, overrides: { id?: number; name?: string } = {}): number {
  const n = next();
  const result = db
    .prepare('INSERT INTO users (id, name) VALUES (?, ?)')
    .run(overrides.id ?? null, overrides.name ?? `Usuario ${n}`);
  return Number(result.lastInsertRowid);
}

export function insertCategory(db: Db, overrides: { slug?: string; name?: string } = {}): number {
  const n = next();
  const result = db
    .prepare('INSERT INTO categories (slug, name) VALUES (?, ?)')
    .run(overrides.slug ?? `categoria-${n}`, overrides.name ?? `Categoría ${n}`);
  return Number(result.lastInsertRowid);
}

export function insertProduct(db: Db, overrides: ProductOverrides = {}): number {
  const n = next();
  const categoryId = overrides.categoryId ?? insertCategory(db);
  const name = overrides.name ?? `Producto ${n}`;
  const result = db
    .prepare(
      `INSERT INTO products (category_id, name, search_name, price, image_url, stock, points_multiplier, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    )
    .run(
      categoryId,
      name,
      overrides.searchName ?? name.toLowerCase(),
      overrides.price ?? 10_000,
      overrides.imageUrl ?? `https://picsum.photos/seed/test-${n}/480/480`,
      overrides.stock ?? 5,
      overrides.pointsMultiplier ?? 1,
      overrides.createdAt ?? null,
    );
  return Number(result.lastInsertRowid);
}

/** Base `:memory:` migrada y vacía. */
export function createEmptyDb(): Db {
  return openDatabase(':memory:');
}

/** App sobre una base migrada SIN seed, con el usuario 1 ya creado (header `X-User-Id: 1`). */
export function createEmptyApp(): { app: Express; db: Db } {
  const db = createEmptyDb();
  insertUser(db, { id: 1, name: 'Usuario de prueba' });
  return { app: createApp({ db }), db };
}
