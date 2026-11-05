import { transaction, type Db } from '../../db/connection.js';
import { AppError } from '../../errors/app-error.js';
import type { CartRepository } from '../cart/cart.repository.js';
import { purchasePoints } from '../rewards/rewards.js';
import type { OrderRecord, OrdersRepository } from './orders.repository.js';

/** Línea del pedido: `name` y `unitPrice` son la copia del catálogo al momento de comprar. */
export interface OrderItemDto {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  /** `unitPrice * quantity`. */
  lineTotal: number;
}
export interface OrderDto {
  id: number;
  status: 'confirmed';
  /** Suma de `lineTotal`, calculada en el servidor. */
  total: number;
  totalItems: number;
  /** Puntos `PURCHASE` de este pedido según el ledger. */
  pointsAwarded: number;
  createdAt: string;
  items: OrderItemDto[];
}
export interface CheckoutResult {
  data: OrderDto;
  /** `awarded`: lo otorgado por ESTA petición (0 en replay); `balance`: saldo después. */
  rewards: { awarded: number; balance: number };
  /** `true` si esta petición creó el pedido; `false` si fue un replay de la misma clave. */
  created: boolean;
}
export type OrdersService = ReturnType<typeof createOrdersService>;

/**
 * Casos de uso de pedidos. El checkout corre en UNA transacción (BEGIN IMMEDIATE): si algo
 * falla no quedan pedido, ni stock descontado, ni puntos, y el carrito sigue intacto.
 */
export function createOrdersService(db: Db, orders: OrdersRepository, cart: CartRepository) {
  const buildOrder = (userId: number, record: OrderRecord): OrderDto => {
    const items = orders.listItems(record.id).map(
      (i): OrderItemDto => ({ ...i, lineTotal: i.unitPrice * i.quantity }),
    );
    return {
      id: record.id,
      status: 'confirmed',
      total: record.total,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      pointsAwarded: orders.purchasePointsOf(userId, record.id),
      createdAt: record.createdAt,
      items,
    };
  };

  return {
    /**
     * Crea el pedido del usuario desde su carrito, con `key` como clave de idempotencia
     * (por usuario). Misma clave => devuelve el pedido original sin tocar nada.
     * @throws {AppError} 409 `EMPTY_CART` | `OUT_OF_STOCK` | `QUANTITY_EXCEEDS_STOCK`.
     */
    checkout(userId: number, key: string): CheckoutResult {
      return transaction(db, () => {
        const existing = orders.findByKey(userId, key);
        if (existing) {
          return {
            data: buildOrder(userId, existing),
            rewards: { awarded: 0, balance: cart.getBalance(userId) },
            created: false,
          };
        }

        const lines = cart.listLines(userId);
        if (lines.length === 0) throw AppError.conflict('EMPTY_CART', 'El carrito está vacío');

        // Validar TODAS las líneas antes de escribir: sin pedidos parciales.
        for (const line of lines) {
          if (line.stock <= 0) {
            throw AppError.conflict('OUT_OF_STOCK', 'Producto agotado', { productId: line.id });
          }
          if (line.quantity > line.stock) {
            throw AppError.conflict('QUANTITY_EXCEEDS_STOCK', 'La cantidad excede el stock disponible', {
              productId: line.id,
              available: line.stock,
            });
          }
        }

        for (const line of lines) {
          if (!orders.decrementStock(line.id, line.quantity)) {
            throw AppError.conflict('QUANTITY_EXCEEDS_STOCK', 'La cantidad excede el stock disponible', {
              productId: line.id,
              available: 0,
            });
          }
        }

        const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
        const orderId = orders.insertOrder(userId, key, total);
        for (const line of lines) {
          orders.insertItem(orderId, {
            productId: line.id,
            name: line.name,
            unitPrice: line.price,
            quantity: line.quantity,
          });
        }

        const points = purchasePoints(
          lines.map((l) => ({ unitPrice: l.price, quantity: l.quantity, pointsMultiplier: l.pointsMultiplier })),
        );
        // CHECK (points <> 0) en el ledger: con 0 puntos no se inserta nada.
        const awarded = points > 0 && orders.awardPurchase(userId, orderId, points) ? points : 0;

        orders.clearCart(userId);

        const record = orders.findByIdForUser(orderId, userId) as OrderRecord;
        return {
          data: buildOrder(userId, record),
          rewards: { awarded, balance: cart.getBalance(userId) },
          created: true,
        };
      });
    },

    /**
     * Pedido por id, solo si es del usuario.
     * @throws {AppError} 404 `ORDER_NOT_FOUND` si no existe o es de otro usuario.
     */
    getOrder(userId: number, orderId: number): OrderDto {
      const record = orders.findByIdForUser(orderId, userId);
      if (!record) throw AppError.notFound('ORDER_NOT_FOUND', 'Pedido no encontrado');
      return buildOrder(userId, record);
    },
  };
}
