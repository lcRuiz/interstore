import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { httpsUrlOrNull } from '@shared/utils/https-url';
import type { Product } from '../../data-access/catalog.types';

/**
 * Tarjeta presentacional de producto: imagen, nombre (enlace al detalle), categoría, precio e insignias.
 *
 * Sin acciones propias: el padre proyecta botones (carrito, favoritos) en el slot
 * `[card-actions]`, que se superpone a la imagen.
 *
 * @example
 * <app-product-card [product]="p">
 *   <button card-actions type="button" aria-label="Agregar al carrito">…</button>
 * </app-product-card>
 */
@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, NgOptimizedImage, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  /** Producto a mostrar; el precio llega en COP enteros y se muestra tal cual. */
  readonly product = input.required<Product>();
  /**
   * Prioriza la carga de la imagen (`fetchpriority="high"`, sin carga diferida). Actívalo solo
   * en la tarjeta candidata a LCP (la primera visible); por defecto la imagen se carga en diferido.
   */
  readonly priority = input(false);

  protected readonly soldOut = computed(() => this.product().stock === 0);
  /** URL de la imagen solo si es `https:`; cualquier otro esquema se descarta (SR-002). */
  protected readonly imageSrc = computed(() => httpsUrlOrNull(this.product().imageUrl));
}
