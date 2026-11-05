import { HttpErrorResponse } from '@angular/common/http';
import { isApiErrorBody } from './api.types';

/**
 * Error normalizado que reciben stores y componentes. Nunca se expone un
 * `HttpErrorResponse` fuera de `core/api`.
 * `code` es estable (decide la UI); `message` es para mostrar.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Errores que vale la pena reintentar (red caída o fallo del servidor). */
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

/**
 * Normaliza cualquier error a `ApiError`.
 *
 * - Status 0 → `NETWORK_ERROR` (sin conexión o backend caído).
 * - Cuerpo con el contrato del backend → se conservan `code`, `message` y `details`.
 * - Otra respuesta HTTP → `HTTP_ERROR`.
 * - Cualquier otra cosa → `UNKNOWN_ERROR`.
 *
 * @param error Lo que haya lanzado `HttpClient` o el código de la app.
 * @returns El mismo error si ya era `ApiError`; si no, uno nuevo.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor');
    }
    if (isApiErrorBody(error.error)) {
      const { code, message, details } = error.error.error;
      return new ApiError(error.status, code, message, details);
    }
    return new ApiError(
      error.status,
      'HTTP_ERROR',
      `Error inesperado del servidor (${error.status})`,
    );
  }

  return new ApiError(0, 'UNKNOWN_ERROR', 'Ocurrió un error inesperado');
}
