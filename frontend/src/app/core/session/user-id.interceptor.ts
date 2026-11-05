import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api/api.types';
import { Session } from './session';

/** Agrega `X-User-Id` solo a las peticiones hacia nuestra API. */
export const userIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  const userId = inject(Session).userId();
  return next(req.clone({ setHeaders: { 'X-User-Id': String(userId) } }));
};
