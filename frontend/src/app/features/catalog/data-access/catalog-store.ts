import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, of, switchMap } from 'rxjs';
import { toApiError } from '@core/api/api-error';
import type { PageMeta } from '@core/api/api.types';
import { LoadState } from '@shared/utils/load-state';
import { CatalogApi } from './catalog-api';
import type { Category, Product, ProductQuery } from './catalog.types';

/**
 * Estado del catálogo: productos de la página actual, metadatos de paginación y categorías.
 *
 * El servidor es la fuente de verdad: este store no filtra ni pagina, solo guarda lo que
 * responde `GET /api/products` para la última consulta.
 */
@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly api = inject(CatalogApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSignal = signal<LoadState<Product[]>>(LoadState.idle);
  private readonly metaSignal = signal<PageMeta | null>(null);
  private readonly categoriesSignal = signal<Category[]>([]);

  private readonly requests = new Subject<ProductQuery>();
  private lastQuery: ProductQuery | null = null;
  private categoriesRequested = false;

  /** Estado de carga de la página de productos actual. */
  readonly state = this.stateSignal.asReadonly();
  /** Metadatos de paginación de la última respuesta; `null` antes de la primera. */
  readonly meta = this.metaSignal.asReadonly();
  /** Categorías para el filtro; vacío mientras cargan o si la carga falló. */
  readonly categories = this.categoriesSignal.asReadonly();

  constructor() {
    this.requests
      .pipe(
        // switchMap cancela la petición HTTP anterior: una respuesta vieja nunca pisa a la nueva.
        switchMap((query) =>
          this.api.listProducts(query).pipe(
            map((page) => ({ page, error: null })),
            catchError((error: unknown) => of({ page: null, error: toApiError(error) })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ page, error }) => {
        if (page) {
          this.metaSignal.set(page.meta);
          this.stateSignal.set(LoadState.from(page.data));
        } else {
          this.stateSignal.set(LoadState.error(error));
        }
      });
  }

  /**
   * Pide la página que describe `query` (`GET /api/products`).
   *
   * Pasa a `loading` de inmediato y cancela cualquier petición anterior en curso.
   *
   * @param query Consulta ya validada.
   */
  load(query: ProductQuery): void {
    this.lastQuery = query;
    this.stateSignal.set(LoadState.loading);
    this.requests.next(query);
  }

  /** Repite la última consulta (acción «Reintentar»); no hace nada si aún no hubo ninguna. */
  reload(): void {
    if (this.lastQuery) this.load(this.lastQuery);
  }

  /**
   * Carga las categorías una sola vez (`GET /api/categories`).
   *
   * Si falla, la lista queda vacía (el filtro solo ofrece «Todas») y la siguiente llamada reintenta.
   */
  loadCategories(): void {
    if (this.categoriesRequested) return;
    this.categoriesRequested = true;
    this.api
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categoriesSignal.set(categories);
        },
        error: () => {
          this.categoriesRequested = false;
        },
      });
  }
}
