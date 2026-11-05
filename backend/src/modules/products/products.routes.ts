import { Router } from 'express';
import { withValidation } from '../../middleware/validate.js';
import { listProductsQuerySchema, productIdParamsSchema } from './products.schemas.js';
import type { ProductsService } from './products.service.js';

/** Montado bajo `currentUser`. */
export function createProductsRouter(service: ProductsService): Router {
  const router = Router();

  // Listado paginado con filtros; la paginación y los filtros se resuelven en el servidor.
  router.get(
    '/',
    withValidation({ query: listProductsQuerySchema }, ({ query }, _req, res) => {
      res.json(service.list(query));
    }),
  );

  router.get(
    '/:id',
    withValidation({ params: productIdParamsSchema }, ({ params }, _req, res) => {
      res.json({ data: service.getById(params.id) });
    }),
  );

  return router;
}
