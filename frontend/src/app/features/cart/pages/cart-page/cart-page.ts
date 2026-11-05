import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersStore } from '@features/orders/data-access/orders-store';
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
  protected readonly orders = inject(OrdersStore);
  /** Sin líneas no se muestra el botón; además se bloquea con operaciones del carrito en vuelo. */
  protected readonly checkoutDisabled = computed(
    () => this.orders.submitting() || this.store.hasPending(),
  );
  protected readonly checkoutLabel = computed(() => {
    if (this.orders.submitting()) return 'Confirmando…';
    return this.orders.canRetry() ? 'Reintentar pedido' : 'Confirmar pedido';
  });

  constructor() {
    this.store.load();
  }
}
