import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { Subscription } from 'rxjs';
import { ApiError, toApiError } from '@core/api/api-error';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { LoadState } from '@shared/utils/load-state';
import { OrdersApi } from '../../data-access/orders-api';
import type { Order } from '../../data-access/orders.types';

const NOT_FOUND_CODE = 'ORDER_NOT_FOUND';

/**
 * Confirmación de pedido (`/orders/:id`): número, líneas, total y puntos ganados.
 *
 * Todo lo mostrado viene del servidor (`GET /api/orders/:id`), por lo que sirve tras recargar la
 * página. El `:id` se valida como entero positivo antes de pedir nada; uno inválido se trata como
 * pedido no encontrado, sin llamar a la API.
 */
@Component({
  selector: 'app-order-page',
  imports: [CurrencyPipe, RouterLink, ErrorState],
  templateUrl: './order-page.html',
  styleUrl: './order-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPage {
  private readonly api = inject(OrdersApi);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | undefined;

  /** Parámetro de ruta `id`; se valida como entero positivo antes de usarse. */
  readonly id = input<string | undefined>(undefined);

  protected readonly state = signal<LoadState<Order>>(LoadState.idle);
  protected readonly notFound = computed(() => {
    const s = this.state();
    return s.status === 'error' && s.error.code === NOT_FOUND_CODE;
  });

  constructor() {
    effect(() => {
      const raw = this.id();
      untracked(() => {
        this.load(raw);
      });
    });
  }

  protected reload(): void {
    this.load(this.id());
  }

  private load(raw: string | undefined): void {
    this.request?.unsubscribe();
    const id = parseOrderId(raw);
    if (id === null) {
      this.state.set(LoadState.error(new ApiError(404, NOT_FOUND_CODE, 'Pedido no encontrado')));
      return;
    }
    this.state.set(LoadState.loading);
    this.request = this.api
      .getOrder(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          this.state.set(LoadState.from(order, () => false));
        },
        error: (err: unknown) => {
          this.state.set(LoadState.error(toApiError(err)));
        },
      });
  }
}

/** Entero positivo en base 10 sin signo, ceros a la izquierda ni decimales; si no, `null`. */
function parseOrderId(raw: string | undefined): number | null {
  if (raw === undefined || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
