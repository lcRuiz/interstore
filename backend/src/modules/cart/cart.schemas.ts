import { z } from 'zod';

export const MAX_QUANTITY = 99;

const quantity = z.number().int().min(1).max(MAX_QUANTITY);
const productId = z.number().int().min(1).max(2_147_483_647);

/** Body de `POST /api/cart/items`. Estricto: cualquier campo extra (points, userId, price...) es 400. */
export const addItemBodySchema = z.strictObject({ productId, quantity: quantity.default(1) });
export type AddItemBody = z.output<typeof addItemBodySchema>;

/** Body de `PATCH /api/cart/items/:productId`. */
export const setQuantityBodySchema = z.strictObject({ quantity });

/** Param `:productId`: entero positivo en notación decimal. */
export const cartItemParamsSchema = z.object({
  productId: z
    .string()
    .regex(/^[1-9]\d{0,9}$/, 'debe ser un entero positivo')
    .transform(Number),
});
