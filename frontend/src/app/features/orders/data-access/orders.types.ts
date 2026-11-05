/**
 * Tipos de pedidos, espejo del contrato del backend (`/api/orders`).
 * Todo lo calculado (totales, puntos) lo decide el servidor; el cliente solo lo muestra.
 */
import type { Rewards } from '@features/cart/data-access/cart.types';

/** Línea de un pedido confirmado. Montos en COP enteros. */
export interface OrderItem {
  productId: number;
  /** Nombre del producto al momento de la compra. */
  name: string;
  /** Precio unitario en COP al momento de la compra. */
  unitPrice: number;
  quantity: number;
  /** `unitPrice * quantity`, calculado por el servidor. */
  lineTotal: number;
}

/** Pedido confirmado (`POST /api/orders`, `GET /api/orders/:id`). */
export interface Order {
  id: number;
  status: 'confirmed';
  /** Total del pedido en COP. */
  total: number;
  /** Unidades totales del pedido. */
  totalItems: number;
  /** Puntos otorgados por este pedido (0 si no hubo premio); se conserva tras un replay. */
  pointsAwarded: number;
  /** Fecha de creación en ISO 8601. */
  createdAt: string;
  items: OrderItem[];
}

/** Respuesta de `POST /api/orders`: 201, o 200 si es un replay con `rewards.awarded` en 0. */
export interface CreateOrderResponse {
  data: Order;
  rewards: Rewards;
}
