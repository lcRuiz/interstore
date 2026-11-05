import { Router } from 'express';
import { getCurrentUser } from '../../middleware/current-user.js';
import { withValidation } from '../../middleware/validate.js';
import { checkoutBodySchema, orderParamsSchema, parseIdempotencyKey } from './orders.schemas.js';
import type { OrdersService } from './orders.service.js';

/** Montado bajo `requireUser`. El usuario sale SIEMPRE de la sesión; nunca se recibe precio, total ni puntos. */
export function createOrdersRouter(service: OrdersService): Router {
  const router = Router();

  router.post(
    '/',
    withValidation({ body: checkoutBodySchema }, (_input, req, res) => {
      const key = parseIdempotencyKey(req.header('Idempotency-Key'));
      const { created, ...payload } = service.checkout(getCurrentUser(req).id, key);
      res.status(created ? 201 : 200).json(payload);
    }),
  );

  router.get(
    '/:id',
    withValidation({ params: orderParamsSchema }, ({ params }, req, res) => {
      res.json({ data: service.getOrder(getCurrentUser(req).id, params.id) });
    }),
  );

  return router;
}
