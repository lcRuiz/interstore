import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { toApiError } from './api-error';

/**
 * Convierte cualquier error HTTP en `ApiError` con el contrato del backend.
 *
 * Va después de `userIdInterceptor` en `app.config.ts`, así envuelve la petición
 * ya completa. Afecta a todas las peticiones de `HttpClient`.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toApiError(error))));
