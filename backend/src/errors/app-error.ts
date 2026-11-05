/**
 * Error de dominio con código HTTP y un `code` estable que el cliente puede
 * usar para decidir qué mostrar (el `message` es solo para humanos).
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(code: string, message: string, details?: unknown): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(code: string, message: string): AppError {
    return new AppError(401, code, message);
  }

  static notFound(code: string, message: string): AppError {
    return new AppError(404, code, message);
  }

  static conflict(code: string, message: string, details?: unknown): AppError {
    return new AppError(409, code, message, details);
  }
}

/** Forma única de todos los errores que devuelve la API. */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
