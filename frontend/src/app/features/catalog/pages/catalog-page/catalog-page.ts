import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { Pagination } from '@shared/ui/pagination/pagination';
import { CatalogStore } from '../../data-access/catalog-store';
import { parseCatalogQuery, toQueryParams } from '../../data-access/catalog-query';
import type { ProductQuery, ProductSort } from '../../data-access/catalog.types';
import { CatalogFilters } from '../../ui/catalog-filters/catalog-filters';
import { ProductCard } from '../../ui/product-card/product-card';
import { ProductGridSkeleton } from '../../ui/product-grid-skeleton/product-grid-skeleton';

/**
 * Página del catálogo: filtros, listado y paginación del servidor.
 *
 * La URL es la fuente de verdad. Los query params llegan como inputs
 * (`withComponentInputBinding()`), se validan con `parseCatalogQuery` y se pasan al
 * `CatalogStore`; cada acción del usuario solo navega, y el cambio de URL dispara la consulta.
 * Cambiar categoría, búsqueda u orden vuelve a la página 1.
 */
@Component({
  selector: 'app-catalog-page',
  imports: [CatalogFilters, ProductCard, ProductGridSkeleton, Pagination, EmptyState, ErrorState],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  private readonly store = inject(CatalogStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Query param `category` (slug); se valida antes de usarse. */
  readonly category = input<string | undefined>(undefined);
  /** Query param `q` (búsqueda por nombre); se recorta y se limita a 80 caracteres. */
  readonly q = input<string | undefined>(undefined);
  /** Query param `sort` (`name`, `price` o `newest`); otro valor equivale a `newest`. */
  readonly sort = input<string | undefined>(undefined);
  /** Query param `page` (entero ≥ 1); otro valor equivale a 1. */
  readonly page = input<string | undefined>(undefined);

  /**
   * Imágenes con carga prioritaria: la primera fila de escritorio (4 columnas; en móvil, dos
   * filas). En una grilla de imágenes iguales el candidato a LCP depende del orden de pintado.
   */
  protected readonly priorityImages = 4;

  protected readonly state = this.store.state;
  protected readonly meta = this.store.meta;
  protected readonly categories = this.store.categories;

  protected readonly query = computed(
    () =>
      parseCatalogQuery({
        category: this.category(),
        q: this.q(),
        sort: this.sort(),
        page: this.page(),
      }),
    // Dos URLs distintas pueden normalizarse a la misma consulta: no se vuelve a pedir.
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );

  protected readonly products = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.data : [];
  });

  protected readonly resultsLabel = computed(() => {
    const state = this.state();
    if (state.status === 'success') {
      return `Mostrando ${state.data.length} de ${this.meta()?.total ?? state.data.length} productos`;
    }
    if (state.status === 'empty') return `Mostrando 0 de ${this.meta()?.total ?? 0} productos`;
    if (state.status === 'loading') return 'Cargando productos…';
    return '';
  });

  constructor() {
    this.store.loadCategories();
    // Efecto hacia fuera (petición HTTP): cada cambio de URL válida dispara la consulta.
    effect(() => {
      const query = this.query();
      untracked(() => {
        this.store.load(query);
      });
    });
  }

  protected setCategory(category: string | undefined): void {
    this.navigate({ ...this.query(), category, page: 1 });
  }

  protected setSearch(text: string): void {
    this.navigate({ ...this.query(), q: text || undefined, page: 1 });
  }

  protected setSort(sort: ProductSort): void {
    this.navigate({ ...this.query(), sort, page: 1 });
  }

  protected goToPage(page: number): void {
    this.navigate({ ...this.query(), page });
  }

  protected clearFilters(): void {
    this.navigate({ page: 1, pageSize: this.query().pageSize, sort: 'newest' });
  }

  protected retry(): void {
    this.store.reload();
  }

  private navigate(next: ProductQuery): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toQueryParams(next),
      queryParamsHandling: 'merge',
    });
  }
}
