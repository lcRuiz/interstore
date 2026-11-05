/**
 * Tipos espejo del contrato del backend (`backend/src`).
 * Si el backend cambia una forma de respuesta, este archivo cambia en el mismo commit.
 */

/** Prefijo de todas las rutas de la API. En dev lo resuelve `proxy.conf.json`. */
export const API_BASE_URL = '/api';

/** Respuesta exitosa estándar: `{ data }`. */
export interface ApiResponse<T> {
  data: T;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Respuesta paginada: `{ data: T[], meta }`. */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Cuerpo de error estándar: `{ error: { code, message, details? } }`. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Indica si un valor tiene la forma de `ApiErrorBody` (exige `code` y `message` como strings). */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = value.error;
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as Record<string, unknown>)['code'] === 'string' &&
    typeof (error as Record<string, unknown>)['message'] === 'string'
  );
}
