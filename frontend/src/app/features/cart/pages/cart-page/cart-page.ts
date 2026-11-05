import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { CartStore } from '../../data-access/cart-store';
import { CartLine } from '../../ui/cart-line/cart-line';

/**
 * Página del carrito (`/cart`): carga, error, vacío y éxito.
 *
 * Los totales mostrados son los del servidor; durante una operación son provisionales.
 * Los errores de las acciones se anuncian en una región `aria-live`.
 */
@Component({
  selector: 'app-cart-page',
  imports: [CurrencyPipe, RouterLink, ErrorState, CartLine],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {
  protected readonly store = inject(CartStore);

  constructor() {
    this.store.load();
  }
}
