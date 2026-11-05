import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon/icon';
import { httpsUrlOrNull } from '@shared/utils/https-url';
import { Minus, Plus, Trash2 } from 'lucide-angular';
import { MAX_QUANTITY, type CartItem } from '../../data-access/cart.types';

/**
 * Línea del carrito: imagen, datos, stepper de cantidad y acción de quitar.
 *
 * @example
 * <app-cart-line [item]="item" (quantityChange)="setQty($event)" (remove)="remove()" />
 */
@Component({
  selector: 'app-cart-line',
  imports: [CurrencyPipe, NgOptimizedImage, RouterLink, Icon],
  templateUrl: './cart-line.html',
  styleUrl: './cart-line.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartLine {
  /** Línea a mostrar; los montos (COP enteros) vienen del servidor o son provisionales. */
  readonly item = input.required<CartItem>();
  /** Se emite con la nueva cantidad (entera, 1..99) al pulsar «+» o «−». */
  readonly quantityChange = output<number>();
  /** Se emite al pulsar «Quitar». */
  readonly remove = output();

  protected readonly MinusIcon = Minus;
  protected readonly PlusIcon = Plus;
  protected readonly TrashIcon = Trash2;

  protected readonly imageSrc = computed(() => httpsUrlOrNull(this.item().product.imageUrl));
  protected readonly canDecrease = computed(() => this.item().quantity > 1);
  protected readonly canIncrease = computed(
    () => this.item().quantity < Math.min(this.item().product.stock, MAX_QUANTITY),
  );
}
