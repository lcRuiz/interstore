import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Product } from '../../data-access/catalog.types';

/** Dimensiones intrínsecas de las imágenes del seed (480x480); evitan saltos de layout. */
const IMAGE_SIZE = 480;

/**
 * Tarjeta presentacional de producto: imagen, nombre, categoría, precio e insignias.
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
  imports: [CurrencyPipe, NgOptimizedImage],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  /** Producto a mostrar; el precio llega en COP enteros y se muestra tal cual. */
  readonly product = input.required<Product>();

  protected readonly imageSize = IMAGE_SIZE;
  protected readonly soldOut = computed(() => this.product().stock === 0);
  /** URL de la imagen solo si es `https:`; cualquier otro esquema se descarta (SR-002). */
  protected readonly imageSrc = computed(() => httpsUrlOrNull(this.product().imageUrl));
}

function httpsUrlOrNull(value: string): string | null {
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
