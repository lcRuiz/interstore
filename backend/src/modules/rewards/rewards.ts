/** Puntos por agregar un producto al carrito por primera vez (una sola vez por usuario y producto). */
export const CART_ADD_POINTS = 10;

/** Un punto por cada $10.000 COP de subtotal de línea, multiplicado por el `pointsMultiplier` del producto. */
export const PURCHASE_POINTS_UNIT = 10_000;

export interface PurchaseLine {
  unitPrice: number;
  quantity: number;
  pointsMultiplier: number;
}

/**
 * Puntos de un pedido: suma por línea de `floor(unitPrice × quantity × pointsMultiplier / 10_000)`.
 * El redondeo es por línea (no sobre el total). Función pura.
 */
export function purchasePoints(lines: readonly PurchaseLine[]): number {
  return lines.reduce(
    (sum, l) => sum + Math.floor((l.unitPrice * l.quantity * l.pointsMultiplier) / PURCHASE_POINTS_UNIT),
    0,
  );
}
