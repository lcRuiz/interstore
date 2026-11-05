import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Elemento de la lista: una página o un hueco («…»). */
interface PageItem {
  key: string;
  /** Número de página; `null` para un hueco. */
  page: number | null;
}

/** Hasta este total se listan todas las páginas sin resumir. */
const MAX_FULL_LIST = 7;

/**
 * Navegación de páginas accesible: `nav` con botones anterior/siguiente y números.
 *
 * Con muchas páginas muestra la primera, la última y la actual con sus vecinas, separadas por «…».
 * No se renderiza cuando hay una página o ninguna.
 *
 * @example
 * <app-pagination [page]="meta.page" [totalPages]="meta.totalPages" (pageChange)="goTo($event)" />
 */
@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  /** Página actual (base 1). */
  readonly page = input.required<number>();
  /** Total de páginas, según `meta.totalPages` del servidor. */
  readonly totalPages = input.required<number>();
  /** Se emite con el número de página elegido; nunca con la actual ni fuera de rango. */
  readonly pageChange = output<number>();

  protected readonly items = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= MAX_FULL_LIST) {
      return Array.from({ length: total }, (_, i) => ({ key: 'p' + (i + 1), page: i + 1 }));
    }
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    const items: PageItem[] = [{ key: 'p1', page: 1 }];
    if (start > 2) items.push({ key: 'gap-start', page: null });
    for (let n = start; n <= end; n++) items.push({ key: 'p' + n, page: n });
    if (end < total - 1) items.push({ key: 'gap-end', page: null });
    items.push({ key: 'p' + total, page: total });
    return items;
  });

  protected goTo(target: number): void {
    if (target < 1 || target > this.totalPages() || target === this.page()) return;
    this.pageChange.emit(target);
  }
}
