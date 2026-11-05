import type { User } from '../modules/users/users.repository.js';

declare global {
  namespace Express {
    interface Request {
      /** Lo asigna el middleware `currentUser`. */
      user?: User;
    }
  }
}

export {};
