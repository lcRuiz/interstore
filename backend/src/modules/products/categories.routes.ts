import { Router } from 'express';
import type { ProductsService } from './products.service.js';

/** Montado bajo `currentUser`. */
export function createCategoriesRouter(service: ProductsService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ data: service.listCategories() });
  });

  return router;
}
