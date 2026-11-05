import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Skeleton de la grilla de productos con las dimensiones finales de la tarjeta.
 *
 * Usa la misma grilla que la lista real (`_grid.scss`) y se oculta a los lectores de pantalla:
 * el contenedor que lo muestra anuncia la carga con `aria-busy`.
 *
 * @example
 * <app-product-grid-skeleton [count]="12" />
 */
@Component({
  selector: 'app-product-grid-skeleton',
  templateUrl: './product-grid-skeleton.html',
  styleUrl: './product-grid-skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGridSkeleton {
  /** Cantidad de tarjetas fantasma; por defecto una página completa (12). */
  readonly count = input(12);

  protected readonly cards = computed(() => Array.from({ length: this.count() }, (_, i) => i));
}
