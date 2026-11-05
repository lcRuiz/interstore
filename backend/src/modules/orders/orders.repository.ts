import type { StatementSync } from 'node:sqlite';
import type { Db } from '../../db/connection.js';

export interface OrderRecord {
  id: number;
  total: number;
  createdAt: string;
}
export interface OrderItemRecord {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
}
export type OrdersRepository = ReturnType<typeof createOrdersRepository>;

/**
 * Acceso a datos de pedidos. SQL 100 % parametrizado; toda lectura de pedidos se filtra
 * por `user_id` (el de la sesión). Las escrituras deben llamarse dentro de `transaction()`.
 */
export function createOrdersRepository(db: Db) {
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
    /** Pedido del usuario con esa clave de idempotencia (replay). */
    findByKey(userId: number, key: string): OrderRecord | undefined {
      return stmt(
        `SELECT id, total, created_at AS createdAt FROM orders WHERE user_id = ? AND idempotency_key = ?`,
      ).get(userId, key) as OrderRecord | undefined;
    },

    /** Pedido por id SOLO si es del usuario (otro dueño equivale a inexistente). */
    findByIdForUser(orderId: number, userId: number): OrderRecord | undefined {
      return stmt(`SELECT id, total, created_at AS createdAt FROM orders WHERE id = ? AND user_id = ?`).get(
        orderId,
        userId,
      ) as OrderRecord | undefined;
    },

    /** Líneas del pedido (copia de nombre y precio de la compra). */
    listItems(orderId: number): OrderItemRecord[] {
      return stmt(
        `SELECT product_id AS productId, product_name AS name, unit_price AS unitPrice, quantity
         FROM order_items WHERE order_id = ? ORDER BY product_id ASC`,
      ).all(orderId) as unknown as OrderItemRecord[];
    },

    /** Descuenta stock solo si alcanza. @returns `true` si descontó. */
    decrementStock(productId: number, quantity: number): boolean {
      const result = stmt('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?').run(
        quantity,
        productId,
        quantity,
      );
      return Number(result.changes) > 0;
    },

    /** Inserta el pedido (estado por defecto `confirmed`). @returns el id nuevo. */
    insertOrder(userId: number, key: string, total: number): number {
      const result = stmt('INSERT INTO orders (user_id, idempotency_key, total) VALUES (?, ?, ?)').run(
        userId,
        key,
        total,
      );
      return Number(result.lastInsertRowid);
    },

    insertItem(orderId: number, item: OrderItemRecord): void {
      stmt(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)`,
      ).run(orderId, item.productId, item.name, item.unitPrice, item.quantity);
    },

    /**
     * Registra `PURCHASE` en el ledger (`ref_id` = id del pedido); idempotente por
     * `UNIQUE(user_id, action, ref_id)`. El saldo lo suma el trigger.
     * @returns `true` si se insertó.
     */
    awardPurchase(userId: number, orderId: number, points: number): boolean {
      const result = stmt(
        `INSERT INTO points_ledger (user_id, action, ref_id, points) VALUES (?, 'PURCHASE', ?, ?)
         ON CONFLICT (user_id, action, ref_id) DO NOTHING`,
      ).run(userId, orderId, points);
      return Number(result.changes) > 0;
    },

    /** Puntos `PURCHASE` del pedido según el ledger (0 si no hubo). */
    purchasePointsOf(userId: number, orderId: number): number {
      const row = stmt(
        `SELECT COALESCE(SUM(points), 0) AS points FROM points_ledger
         WHERE user_id = ? AND action = 'PURCHASE' AND ref_id = ?`,
      ).get(userId, orderId) as { points: number };
      return row.points;
    },

    /** Vacía el carrito del usuario. */
    clearCart(userId: number): void {
      stmt('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    },
  };
}
