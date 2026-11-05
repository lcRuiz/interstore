import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { toApiError, type ApiError } from '@core/api/api-error';
import { CartStore } from '@features/cart/data-access/cart-store';
import { RewardsStore } from '@features/rewards/data-access/rewards-store';
import { OrdersApi } from './orders-api';
import type { CreateOrderResponse } from './orders.types';

const GENERIC_NOTICE = 'No pudimos confirmar tu pedido. Inténtalo de nuevo.';
const RETRY_NOTICE =
  'No pudimos confirmar tu pedido por un problema de conexión. Puedes reintentar.';
const EMPTY_CART_NOTICE = 'Tu carrito está vacío';
const STOCK_NOTICE = 'Algunos productos ya no tienen stock suficiente. Revisa tu carrito.';

/**
 * Checkout del carrito del usuario actual.
 *
 * No es optimista: espera al servidor, que decide totales y puntos. Cada intento usa una
 * `Idempotency-Key` propia que se conserva para reintentar tras un fallo de red o 5xx (si el primer
 * intento sí se procesó, el servidor devuelve el pedido original) y se descarta tras el éxito o un
 * error definitivo. Orquesta `CartStore` y `RewardsStore` y navega a `/orders/:id`.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly api = inject(OrdersApi);
  private readonly cart = inject(CartStore);
  private readonly rewards = inject(RewardsStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly submittingState = signal(false);
  private readonly noticeState = signal<string | null>(null);
  private readonly retryState = signal(false);
  private idempotencyKey: string | null = null;

  /** `true` mientras hay un checkout en vuelo. */
  readonly submitting = this.submittingState.asReadonly();
  /** Mensaje propio del último error del checkout (según `code`), o `null`. */
  readonly notice = this.noticeState.asReadonly();
  /** `true` si el último fallo es de red/5xx y se puede reintentar con la misma clave. */
  readonly canRetry = this.retryState.asReadonly();

  /**
   * Confirma el carrito como pedido (`POST /api/orders`).
   *
   * Ignora la llamada si ya hay una petición en vuelo. En éxito vacía el `CartStore`, aplica el saldo
   * del servidor a `RewardsStore` (con el premio del pedido, `order.pointsAwarded`) y navega a
   * `/orders/:id`. Ante stock agotado o carrito vacío recarga el carrito para reflejar el estado real.
   */
  checkout(): void {
    if (this.submittingState()) return;
    this.idempotencyKey ??= crypto.randomUUID();
    this.submittingState.set(true);
    this.noticeState.set(null);
    this.retryState.set(false);

    this.api
      .createOrder(this.idempotencyKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.onSuccess(response);
        },
        error: (err: unknown) => {
          this.onError(toApiError(err));
        },
      });
  }

  /** Descarta el aviso actual. */
  dismissNotice(): void {
    this.noticeState.set(null);
    this.retryState.set(false);
  }

  private onSuccess({ data: order, rewards }: CreateOrderResponse): void {
    this.idempotencyKey = null;
    this.submittingState.set(false);
    this.cart.clear();
    // En un replay el servidor responde awarded 0: el premio mostrado es el del pedido.
    this.rewards.applyRewards({ awarded: order.pointsAwarded, balance: rewards.balance });
    void this.router.navigateByUrl(`/orders/${order.id}`);
  }

  private onError(error: ApiError): void {
    this.submittingState.set(false);
    if (error.retryable) {
      // Se conserva la clave: si el primer intento sí llegó, el reintento devuelve ese pedido.
      this.noticeState.set(RETRY_NOTICE);
      this.retryState.set(true);
      return;
    }
    this.idempotencyKey = null;
    switch (error.code) {
      case 'EMPTY_CART':
        this.noticeState.set(EMPTY_CART_NOTICE);
        this.cart.load();
        break;
      case 'OUT_OF_STOCK':
      case 'QUANTITY_EXCEEDS_STOCK':
        this.noticeState.set(STOCK_NOTICE);
        this.cart.load();
        break;
      default:
        this.noticeState.set(GENERIC_NOTICE);
    }
  }
}
