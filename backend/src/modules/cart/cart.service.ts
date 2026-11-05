import { transaction, type Db } from '../../db/connection.js';
import { AppError } from '../../errors/app-error.js';
import { toProductDto, type ProductDto } from '../products/products.service.js';
import { CART_ADD_POINTS } from '../rewards/rewards.js';
import { MAX_QUANTITY } from './cart.schemas.js';
import type { CartRepository } from './cart.repository.js';

export interface CartItemDto {
  productId: number;
  quantity: number;
  product: ProductDto;
  /** `product.price * quantity`, calculado en el servidor. */
  lineTotal: number;
}
export interface CartDto {
  items: CartItemDto[];
  /** Suma de cantidades. */
  totalItems: number;
  /** Suma de `lineTotal`. */
  total: number;
}
export interface RewardsDto {
  /** 0 o `CART_ADD_POINTS`. */
  awarded: number;
  /** `users.points_balance` después de la operación. */
  balance: number;
}
export interface CartResult {
  data: CartDto;
  rewards: RewardsDto;
}
export type CartService = ReturnType<typeof createCartService>;

/**
 * Casos de uso del carrito. Cada escritura corre en UNA transacción (BEGIN IMMEDIATE):
 * si algo falla (incluido el ledger) no quedan ni línea ni puntos.
 */
export function createCartService(db: Db, repo: CartRepository) {
  const buildCart = (userId: number): CartDto => {
    const items = repo.listLines(userId).map((line): CartItemDto => {
      const { quantity, ...record } = line;
      return { productId: line.id, quantity, product: toProductDto(record), lineTotal: line.price * quantity };
    });
    return {
      items,
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      total: items.reduce((sum, i) => sum + i.lineTotal, 0),
    };
  };

  /** Valida que `quantity` quepa en el stock y en el máximo por línea. */
  const assertAvailable = (stock: number, quantity: number): void => {
    if (stock <= 0) throw AppError.conflict('OUT_OF_STOCK', 'Producto agotado');
    const available = Math.min(stock, MAX_QUANTITY);
    if (quantity > available) {
      throw AppError.conflict('QUANTITY_EXCEEDS_STOCK', 'La cantidad excede el stock disponible', { available });
    }
  };

  return {
    /** Carrito del usuario de la sesión. */
    getCart(userId: number): CartDto {
      return buildCart(userId);
    },

    /**
     * Agrega (suma) `quantity` a la línea y otorga `CART_ADD` solo la primera vez por producto.
     * @throws {AppError} 404 `PRODUCT_NOT_FOUND`, 409 `OUT_OF_STOCK` | `QUANTITY_EXCEEDS_STOCK`.
     */
    addItem(userId: number, input: { productId: number; quantity: number }): CartResult {
      return transaction(db, () => {
        const product = repo.findProductStock(input.productId);
        if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');
        const next = (repo.getQuantity(userId, input.productId) ?? 0) + input.quantity;
        assertAvailable(product.stock, next);
        repo.setLine(userId, input.productId, next);
        const awarded = repo.awardCartAdd(userId, input.productId, CART_ADD_POINTS) ? CART_ADD_POINTS : 0;
        return { data: buildCart(userId), rewards: { awarded, balance: repo.getBalance(userId) } };
      });
    },

    /**
     * Fija la cantidad de una línea existente. Nunca otorga puntos.
     * @throws {AppError} 404 `CART_ITEM_NOT_FOUND`, 409 `OUT_OF_STOCK` | `QUANTITY_EXCEEDS_STOCK`.
     */
    setQuantity(userId: number, productId: number, quantity: number): CartResult {
      return transaction(db, () => {
        if (repo.getQuantity(userId, productId) === undefined) {
          throw AppError.notFound('CART_ITEM_NOT_FOUND', 'El producto no está en el carrito');
        }
        const product = repo.findProductStock(productId);
        assertAvailable(product?.stock ?? 0, quantity);
        repo.setLine(userId, productId, quantity);
        return { data: buildCart(userId), rewards: { awarded: 0, balance: repo.getBalance(userId) } };
      });
    },

    /** Quita la línea (idempotente). No resta puntos. */
    removeItem(userId: number, productId: number): CartResult {
      return transaction(db, () => {
        repo.deleteLine(userId, productId);
        return { data: buildCart(userId), rewards: { awarded: 0, balance: repo.getBalance(userId) } };
      });
    },
  };
}
