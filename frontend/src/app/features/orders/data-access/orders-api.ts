import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { API_BASE_URL, type ApiResponse } from '@core/api/api.types';
import type { CreateOrderResponse, Order } from './orders.types';

/** Cliente HTTP de pedidos. Solo hace peticiones y mapea tipos. */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);

  /**
   * Confirma el carrito como pedido (`POST /api/orders`), sin body.
   *
   * La misma `idempotencyKey` devuelve el pedido original (200) en lugar de crear otro.
   *
   * @param idempotencyKey Clave de 8 a 64 caracteres `[A-Za-z0-9_-]`, una por intento de checkout.
   * @throws ApiError `EMPTY_CART`, `OUT_OF_STOCK`, `QUANTITY_EXCEEDS_STOCK` (409),
   * `VALIDATION_ERROR` (400), `UNKNOWN_USER` (401), `NETWORK_ERROR` (status 0).
   */
  createOrder(idempotencyKey: string): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${API_BASE_URL}/orders`, null, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  }

  /**
   * Obtiene un pedido del usuario actual (`GET /api/orders/:id`).
   *
   * @throws ApiError `ORDER_NOT_FOUND` (404), `NETWORK_ERROR` (status 0).
   */
  getOrder(id: number): Observable<Order> {
    return this.http
      .get<ApiResponse<Order>>(`${API_BASE_URL}/orders/${id}`)
      .pipe(map((response) => response.data));
  }
}
