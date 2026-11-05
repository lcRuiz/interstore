import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { API_BASE_URL, type ApiResponse } from '@core/api/api.types';
import type { Cart, CartMutationResponse } from './cart.types';

/** Cliente HTTP del carrito. Solo hace peticiones y mapea tipos. */
@Injectable({ providedIn: 'root' })
export class CartApi {
  private readonly http = inject(HttpClient);

  /**
   * Obtiene el carrito (`GET /api/cart`).
   *
   * @throws ApiError `UNKNOWN_USER` (401), `NETWORK_ERROR` (status 0).
   */
  getCart(): Observable<ApiResponse<Cart>> {
    return this.http.get<ApiResponse<Cart>>(`${API_BASE_URL}/cart`);
  }

  /**
   * Agrega unidades (`POST /api/cart/items`); si la línea existe, suma.
   *
   * @throws ApiError `PRODUCT_NOT_FOUND` (404), `OUT_OF_STOCK`, `QUANTITY_EXCEEDS_STOCK` (409).
   */
  addItem(productId: number, quantity: number): Observable<CartMutationResponse> {
    return this.http.post<CartMutationResponse>(`${API_BASE_URL}/cart/items`, {
      productId,
      quantity,
    });
  }

  /**
   * Fija la cantidad de una línea (`PATCH /api/cart/items/:productId`).
   *
   * @throws ApiError `CART_ITEM_NOT_FOUND` (404), `QUANTITY_EXCEEDS_STOCK` (409).
   */
  setQuantity(productId: number, quantity: number): Observable<CartMutationResponse> {
    return this.http.patch<CartMutationResponse>(`${API_BASE_URL}/cart/items/${productId}`, {
      quantity,
    });
  }

  /** Quita una línea (`DELETE /api/cart/items/:productId`); es idempotente. */
  removeItem(productId: number): Observable<CartMutationResponse> {
    return this.http.delete<CartMutationResponse>(`${API_BASE_URL}/cart/items/${productId}`);
  }
}
