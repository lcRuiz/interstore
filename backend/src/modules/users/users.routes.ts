import { Router } from 'express';
import { getCurrentUser } from '../../middleware/current-user.js';

/** Montado bajo `currentUser`. */
export function createMeRouter(): Router {
  const router = Router();

  // Perfil y saldo de puntos del usuario actual.
  router.get('/', (req, res) => {
    res.json({ data: getCurrentUser(req) });
  });

  return router;
}
