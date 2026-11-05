import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import { API_BASE_URL, type ApiResponse, type Paginated } from '@core/api/api.types';
import type { Category, Product, ProductQuery } from './catalog.types';

/** Cliente HTTP del catálogo. Solo hace peticiones y mapea tipos. */
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);

  /**
   * Lista productos paginados (`GET /api/products`).
   *
   * @param query Consulta ya validada; `category` y `q` se omiten si no están definidos.
   * @returns Página de productos con su `meta`.
   * @throws ApiError `VALIDATION_ERROR` (400), `MISSING_USER` o `UNKNOWN_USER` (401), `INTERNAL_ERROR` (500), `NETWORK_ERROR` (status 0).
   */
  listProducts(query: ProductQuery): Observable<Paginated<Product>> {
    // HttpParams codifica los valores: un `q` con `&` o `#` no puede añadir parámetros.
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize)
      .set('sort', query.sort);
    if (query.category) params = params.set('category', query.category);
    if (query.q) params = params.set('q', query.q);
    return this.http.get<Paginated<Product>>(`${API_BASE_URL}/products`, { params });
  }

  /**
   * Obtiene un producto por id (`GET /api/products/:id`).
   *
   * @param id Entero positivo ya validado por quien llama.
   * @throws ApiError `PRODUCT_NOT_FOUND` (404), `UNKNOWN_USER` (401), `NETWORK_ERROR` (status 0).
   */
  getProduct(id: number): Observable<Product> {
    return this.http
      .get<ApiResponse<Product>>(`${API_BASE_URL}/products/${id}`)
      .pipe(map((response) => response.data));
  }

  /**
   * Lista las categorías (`GET /api/categories`), ordenadas por nombre.
   *
   * @throws ApiError `UNKNOWN_USER` (401), `INTERNAL_ERROR` (500), `NETWORK_ERROR` (status 0).
   */
  listCategories(): Observable<Category[]> {
    return this.http
      .get<ApiResponse<Category[]>>(`${API_BASE_URL}/categories`)
      .pipe(map((response) => response.data));
  }
}
