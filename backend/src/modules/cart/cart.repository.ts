import type { StatementSync } from 'node:sqlite';
import type { Db } from '../../db/connection.js';
import type { ProductRecord } from '../products/products.repository.js';

/** Línea del carrito con su producto y categoría aplanados (mismo shape que el catálogo). */
export interface CartLineRecord extends ProductRecord {
  quantity: number;
}
export type CartRepository = ReturnType<typeof createCartRepository>;

/**
 * Acceso a datos del carrito y del ledger de puntos. SQL 100 % parametrizado; toda
 * consulta de líneas se filtra por `user_id` (el de la sesión, nunca del cliente).
 * Las operaciones de escritura deben llamarse dentro de `transaction()` (lo hace el servicio).
 */
export function createCartRepository(db: Db) {
  // Preparación perezosa: no toca el esquema hasta la primera llamada.
  const cache = new Map<string, StatementSync>();
  const stmt = (sql: string): StatementSync => {
    let s = cache.get(sql);
    if (!s) {
      s = db.prepare(sql);
      cache.set(sql, s);
    }
    return s;
  };

  return {
    /** Stock actual del producto, o `undefined` si no existe. */
    findProductStock(productId: number): { stock: number } | undefined {
      return stmt('SELECT stock FROM products WHERE id = ?').get(productId) as { stock: number } | undefined;
    },

    /** Cantidad de la línea del usuario, o `undefined` si no existe. */
    getQuantity(userId: number, productId: number): number | undefined {
      const row = stmt('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, productId) as
        | { quantity: number }
        | undefined;
      return row?.quantity;
    },

    /** Crea la línea o fija su cantidad absoluta (upsert). */
    setLine(userId: number, productId: number, quantity: number): void {
      stmt(
        `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = excluded.quantity, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      ).run(userId, productId, quantity);
    },

    /** Elimina la línea (no falla si no existe). */
    deleteLine(userId: number, productId: number): void {
      stmt('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(userId, productId);
    },

    /** Líneas del usuario ordenadas por `added_at` y luego `product_id`. */
    listLines(userId: number): CartLineRecord[] {
      return stmt(
        `SELECT p.id, p.name, p.price, p.image_url AS imageUrl, p.stock,
                p.points_multiplier AS pointsMultiplier,
                c.slug AS categorySlug, c.name AS categoryName, ci.quantity
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         JOIN categories c ON c.id = p.category_id
         WHERE ci.user_id = ?
         ORDER BY ci.added_at ASC, ci.product_id ASC`,
      ).all(userId) as unknown as CartLineRecord[];
    },

    /**
     * Registra `CART_ADD` en el ledger; `UNIQUE(user_id, action, ref_id)` + `DO NOTHING`
     * hacen el otorgamiento idempotente. El saldo lo suma el trigger.
     * @returns `true` si se insertó (primera vez), `false` si ya existía.
     */
    awardCartAdd(userId: number, productId: number, points: number): boolean {
      const result = stmt(
        `INSERT INTO points_ledger (user_id, action, ref_id, points) VALUES (?, 'CART_ADD', ?, ?)
         ON CONFLICT (user_id, action, ref_id) DO NOTHING`,
      ).run(userId, productId, points);
      return Number(result.changes) > 0;
    },

    /** Saldo actual de puntos del usuario. */
    getBalance(userId: number): number {
      const row = stmt('SELECT points_balance AS balance FROM users WHERE id = ?').get(userId) as { balance: number };
      return row.balance;
    },
  };
}
