import cors from 'cors';
import express, { type Express } from 'express';
import type { Db } from './db/connection.js';
import { errorHandler, notFoundHandler } from './errors/error-handler.js';
import { currentUser } from './middleware/current-user.js';
import { createUsersRepository } from './modules/users/users.repository.js';
import { createMeRouter } from './modules/users/users.routes.js';

export interface AppDeps {
  db: Db;
  corsOrigin?: string;
}

/**
 * Construye la app sin levantar el servidor: los tests la usan con una base
 * en memoria (inyección de dependencias simple, sin contenedor).
 */
export function createApp({ db, corsOrigin }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  const users = createUsersRepository(db);
  const requireUser = currentUser(users);

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });
  app.use('/api/me', requireUser, createMeRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
