import { z } from 'zod';
import { AppError } from '../../errors/app-error.js';

/** `POST /api/orders` no recibe datos: sin body (o `{}`). Cualquier campo (price, total, points, userId...) es 400. */
export const checkoutBodySchema = z.strictObject({}).optional();

/** Param `:id`: entero positivo en notación decimal. */
export const orderParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,9}$/, 'debe ser un entero positivo')
    .transform(Number),
});

/** Header `Idempotency-Key`: 8-64 caracteres `[A-Za-z0-9_-]` (mismo rango que el CHECK de `orders`). */
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

/**
 * Valida el header `Idempotency-Key`.
 * @throws {AppError} 400 `VALIDATION_ERROR` si falta o tiene formato inválido.
 */
export function parseIdempotencyKey(value: string | undefined): string {
  const result = idempotencyKeySchema.safeParse(value);
  if (!result.success) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Datos de entrada inválidos', [
      {
        location: 'header',
        path: 'Idempotency-Key',
        message: 'obligatorio: 8-64 caracteres [A-Za-z0-9_-]',
      },
    ]);
  }
  return result.data;
}
