import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { API_BASE_URL, type ApiResponse } from '@core/api/api.types';
import type { Me } from './rewards.types';

/** Cliente HTTP del usuario y su saldo de puntos. */
@Injectable({ providedIn: 'root' })
export class RewardsApi {
  private readonly http = inject(HttpClient);

  /**
   * Obtiene el usuario actual con su saldo (`GET /api/me`).
   *
   * @throws ApiError `UNKNOWN_USER` (401), `NETWORK_ERROR` (status 0).
   */
  getMe(): Observable<Me> {
    return this.http.get<ApiResponse<Me>>(`${API_BASE_URL}/me`).pipe(map((r) => r.data));
  }
}
