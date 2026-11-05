/**
 * Tipos del carrito, espejo del contrato del backend (`/api/cart`).
 * Todos los montos son COP enteros calculados por el servidor.
 */
import type { Product } from '@features/catalog/data-access/catalog.types';

/** Línea del carrito. */
export interface CartItem {
  productId: number;
  /** Unidades, de 1 a 99. */
  quantity: number;
  /** Producto embebido para pintar la línea sin otra petición. */
  product: Product;
  /** `product.price * quantity`, calculado por el servidor. */
  lineTotal: number;
}

/** Carrito del usuario actual. */
export interface Cart {
  items: CartItem[];
  /** Suma de unidades de todas las líneas. */
  totalItems: number;
  /** Total general en COP. */
  total: number;
}

/** Resultado de puntos de una operación; el cliente solo lo muestra. */
export interface Rewards {
  /** Puntos otorgados por esta operación (0 o 10). */
  awarded: number;
  /** Saldo del usuario después de la operación. */
  balance: number;
}

/** Respuesta de las mutaciones: `POST/PATCH/DELETE /api/cart/items`. */
export interface CartMutationResponse {
  data: Cart;
  rewards: Rewards;
}

/** Máximo de unidades por línea (regla del servidor). */
export const MAX_QUANTITY = 99;
