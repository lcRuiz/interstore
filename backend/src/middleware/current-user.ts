import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import type { User, UsersRepository } from '../modules/users/users.repository.js';

const userIdSchema = z.coerce.number().int().positive();

/**
 * Identifica al usuario por el header `X-User-Id`.
 *
 * SUPUESTO: la prueba no exige autenticación; esto la simula con usuarios
 * sembrados. En producción se reemplazaría por un JWT/sesión verificada, sin
 * tocar los handlers (siguen leyendo `getCurrentUser(req)`).
 */
export function currentUser(users: UsersRepository): RequestHandler {
  return (req, _res, next) => {
    const raw = req.header('x-user-id');
    if (!raw) throw AppError.unauthorized('MISSING_USER', 'Se requiere el header X-User-Id');

    const parsed = userIdSchema.safeParse(raw);
    if (!parsed.success) throw AppError.badRequest('INVALID_USER_ID', 'X-User-Id debe ser un entero positivo');

    const user = users.findById(parsed.data);
    if (!user) throw AppError.unauthorized('UNKNOWN_USER', 'Usuario no encontrado');

    req.user = user;
    next();
  };
}

/** Obtiene el usuario resuelto por `currentUser`; falla si la ruta no lo montó. */
export function getCurrentUser(req: Request): User {
  if (!req.user) throw new Error('currentUser middleware no está montado en esta ruta');
  return req.user;
}
