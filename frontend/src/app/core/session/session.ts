import { Injectable, signal } from '@angular/core';

export interface DemoUser {
  id: number;
  name: string;
}

/** Usuarios sembrados en el backend (`backend/src/db/seed.ts`). */
export const DEMO_USERS: readonly DemoUser[] = [
  { id: 1, name: 'Ana Demo' },
  { id: 2, name: 'Carlos Demo' },
];

/** Usuario con el que arranca la app. */
export const DEFAULT_USER_ID = 1;

/**
 * Sesión simulada. SUPUESTO: la prueba no exige autenticación; el usuario se
 * identifica con el header `X-User-Id`. Reemplazable por un token real sin
 * tocar las features (solo cambia este servicio y su interceptor).
 */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly currentUserId = signal(DEFAULT_USER_ID);

  /** Id del usuario actual; lo lee `userIdInterceptor` en cada petición. */
  readonly userId = this.currentUserId.asReadonly();
  /** Usuarios disponibles para cambiar de sesión. */
  readonly users = DEMO_USERS;

  /**
   * Cambia el usuario actual. Ignora ids que no estén en `DEMO_USERS`.
   *
   * @param id Id de un usuario sembrado en el backend.
   */
  switchUser(id: number): void {
    if (DEMO_USERS.some((user) => user.id === id)) this.currentUserId.set(id);
  }
}
