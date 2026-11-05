import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, filter, map } from 'rxjs';
import { PRODUCT_SORTS, type Category, type ProductSort } from '../../data-access/catalog.types';

/** Espera tras la última pulsación antes de emitir la búsqueda. */
const SEARCH_DEBOUNCE_MS = 300;

/** Longitud máxima de `q` que acepta el servidor. */
const MAX_SEARCH_LENGTH = 80;

const SORT_LABELS: Record<ProductSort, string> = {
  name: 'Nombre',
  price: 'Precio',
  newest: 'Más recientes',
};

/**
 * Barra de filtros del catálogo: búsqueda por nombre, categoría y orden.
 *
 * Es presentacional: no navega ni llama a la API, solo emite los cambios. La búsqueda se emite
 * con debounce de 300 ms y recortada; solo si difiere de lo ya vigente en la URL, de modo que
 * el eco de la navegación no dispara una nueva consulta.
 *
 * @example
 * <app-catalog-filters [categories]="cats" [category]="slug" [q]="text" [sort]="sort"
 *   (categoryChange)="setCategory($event)" (searchChange)="setSearch($event)"
 *   (sortChange)="setSort($event)" />
 */
@Component({
  selector: 'app-catalog-filters',
  templateUrl: './catalog-filters.html',
  styleUrl: './catalog-filters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogFilters {
  private readonly destroyRef = inject(DestroyRef);

  /** Categorías disponibles; la opción «Todas» se agrega sola. */
  readonly categories = input<Category[]>([]);
  /** Slug seleccionado; `undefined` = todas. */
  readonly category = input<string | undefined>(undefined);
  /** Texto de búsqueda vigente en la URL (la fuente de verdad del campo). */
  readonly q = input('');
  /** Orden vigente. */
  readonly sort = input<ProductSort>('newest');
  /** Se emite al elegir categoría con su slug; `undefined` para «Todas». */
  readonly categoryChange = output<string | undefined>();
  /** Se emite 300 ms después de dejar de escribir, con el texto recortado (puede ser vacío). */
  readonly searchChange = output<string>();
  /** Se emite al elegir un orden. */
  readonly sortChange = output<ProductSort>();

  protected readonly sortOptions = PRODUCT_SORTS.map((value) => ({
    value,
    label: SORT_LABELS[value],
  }));
  protected readonly maxLength = MAX_SEARCH_LENGTH;

  /** Último valor emitido o recibido de la URL: contra él se descartan emisiones repetidas. */
  private readonly baseline = linkedSignal(() => this.q().trim());
  /** Valor emitido cuya devolución por la URL aún no llegó (el «eco»). */
  private pendingEcho: string | undefined;
  private readonly typed = new Subject<string>();

  /**
   * Texto del campo. Sigue a `q` (Atrás/Adelante), salvo cuando `q` es el eco de lo que el
   * usuario ya emitió: ahí se conserva lo que sigue escribiendo para no pisarlo.
   */
  protected readonly text = linkedSignal<string, string>({
    source: this.q,
    computation: (incoming, previous) => {
      if (previous && incoming === this.pendingEcho) {
        this.pendingEcho = undefined;
        return previous.value;
      }
      return incoming;
    },
  });

  constructor() {
    this.typed
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        filter((value) => value !== this.baseline()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.baseline.set(value);
        this.pendingEcho = value;
        this.searchChange.emit(value);
      });
  }

  protected onSearchInput(value: string): void {
    this.text.set(value);
    this.typed.next(value);
  }

  protected onCategory(slug: string): void {
    this.categoryChange.emit(slug || undefined);
  }

  protected onSort(value: string): void {
    const sort = PRODUCT_SORTS.find((candidate) => candidate === value);
    if (sort) this.sortChange.emit(sort);
  }
}
