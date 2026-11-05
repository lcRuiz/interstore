import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, type ErrorBody } from './app-error.js';

/** Cualquier ruta no registrada responde 404 con el formato estándar. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound('ROUTE_NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.path}`));
};

/**
 * Traduce cualquier error a { error: { code, message, details? } }.
 * Los errores inesperados se registran pero nunca exponen el stack al cliente.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, body } = toErrorResponse(err);
  if (status >= 500) console.error(err);
  res.status(status).json(body);
};

function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: { error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) } },
    };
  }

  // Errores de express.json() (body-parser): JSON malformado o payload muy grande.
  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') {
      return { status: 400, body: { error: { code: 'INVALID_JSON', message: 'El cuerpo no es JSON válido' } } };
    }
    if (err.type === 'entity.too.large') {
      return { status: 413, body: { error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo excede el tamaño permitido' } } };
    }
  }

  return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } } };
}

function isBodyParserError(err: unknown): err is { type: string } {
  return typeof err === 'object' && err !== null && 'type' in err && typeof err.type === 'string';
}
