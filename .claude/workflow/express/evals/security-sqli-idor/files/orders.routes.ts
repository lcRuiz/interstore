import { Router } from 'express';
import type { Db } from '../../db/connection.js';

/** Detalle de un pedido. */
export function createOrdersRouter(db: Db): Router {
  const router = Router();
  router.get('/:id', (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado' } });
    res.json({ data: order });
  });
  return router;
}
