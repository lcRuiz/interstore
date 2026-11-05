import type { Db } from '../../db/connection.js';

/** Busca productos por nombre. */
export function searchProducts(db: Db, q: string, sort: string) {
  return db
    .prepare(`SELECT id, name, price FROM products WHERE name LIKE '%${q}%' ORDER BY ${sort} LIMIT 20`)
    .all();
}
