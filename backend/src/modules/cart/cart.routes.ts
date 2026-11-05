import { Router } from 'express';
import { getCurrentUser } from '../../middleware/current-user.js';
import { withValidation } from '../../middleware/validate.js';
import { addItemBodySchema, cartItemParamsSchema, setQuantityBodySchema } from './cart.schemas.js';
import type { CartService } from './cart.service.js';

/** Montado bajo `currentUser`. El usuario sale SIEMPRE de la sesión, nunca del body/ruta. */
export function createCartRouter(service: CartService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({ data: service.getCart(getCurrentUser(req).id) });
  });

  router.post(
    '/items',
    withValidation({ body: addItemBodySchema }, ({ body }, req, res) => {
      res.json(service.addItem(getCurrentUser(req).id, body));
    }),
  );

  router.patch(
    '/items/:productId',
    withValidation({ params: cartItemParamsSchema, body: setQuantityBodySchema }, ({ params, body }, req, res) => {
      res.json(service.setQuantity(getCurrentUser(req).id, params.productId, body.quantity));
    }),
  );

  router.delete(
    '/items/:productId',
    withValidation({ params: cartItemParamsSchema }, ({ params }, req, res) => {
      res.json(service.removeItem(getCurrentUser(req).id, params.productId));
    }),
  );

  return router;
}
