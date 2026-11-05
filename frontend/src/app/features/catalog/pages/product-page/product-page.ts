import { CurrencyPipe, NgOptimizedImage } from '@angular/common';
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
import { CartStore } from '@features/cart/data-access/cart-store';
import { MAX_QUANTITY } from '@features/cart/data-access/cart.types';
import { RewardsStore } from '@features/rewards/data-access/rewards-store';
import { ErrorState } from '@shared/ui/error-state/error-state';
import { httpsUrlOrNull } from '@shared/utils/https-url';
import { LoadState } from '@shared/utils/load-state';
import { CatalogApi } from '../../data-access/catalog-api';
import type { Product } from '../../data-access/catalog.types';

const NOT_FOUND_CODE = 'PRODUCT_NOT_FOUND';

/**
 * Detalle de producto (`/products/:id`): imagen, datos, selector de cantidad y «Agregar al carrito».
 *
 * El `:id` llega como input de ruta y se valida como entero positivo antes de pedir nada;
 * un id inválido se trata como producto no encontrado, sin llamar a la API.
 */
@Component({
  selector: 'app-product-page',
  imports: [CurrencyPipe, NgOptimizedImage, RouterLink, ErrorState],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPage {
  private readonly api = inject(CatalogApi);
  private readonly cart = inject(CartStore);
  private readonly rewards = inject(RewardsStore);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | undefined;

  /** Parámetro de ruta `id`; se valida como entero positivo antes de usarse. */
  readonly id = input<string | undefined>(undefined);

  protected readonly state = signal<LoadState<Product>>(LoadState.idle);
  protected readonly quantity = signal(1);
  private readonly added = signal(false);

  protected readonly imageSrc = computed(() => {
    const s = this.state();
    return s.status === 'success' ? httpsUrlOrNull(s.data.imageUrl) : null;
  });
  /** Cantidades ofrecidas: de 1 a min(stock, 99). */
  protected readonly quantities = computed(() => {
    const s = this.state();
    const max = s.status === 'success' ? Math.min(s.data.stock, MAX_QUANTITY) : 0;
    return Array.from({ length: max }, (_, i) => i + 1);
  });
  protected readonly adding = computed(() => {
    const s = this.state();
    return s.status === 'success' && this.cart.isPending(s.data.id);
  });
  /** Puntos de la última operación; solo se muestran tras agregar desde esta página. */
  protected readonly award = computed(() => (this.added() ? this.rewards.lastAward() : 0));
  protected readonly notice = this.cart.notice;
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

  protected selectQuantity(event: Event): void {
    this.quantity.set(Number((event.target as HTMLSelectElement).value));
  }

  protected add(product: Product): void {
    this.added.set(true);
    this.cart.add(product, this.quantity());
  }

  private load(raw: string | undefined): void {
    this.request?.unsubscribe();
    this.quantity.set(1);
    this.added.set(false);
    const id = parseProductId(raw);
    if (id === null) {
      this.state.set(LoadState.error(new ApiError(404, NOT_FOUND_CODE, 'Producto no encontrado')));
      return;
    }
    this.state.set(LoadState.loading);
    this.request = this.api
      .getProduct(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (product) => {
          this.state.set(LoadState.from(product, () => false));
        },
        error: (err: unknown) => {
          this.state.set(LoadState.error(toApiError(err)));
        },
      });
  }
}

/** Entero positivo en base 10 sin signo, ceros a la izquierda ni decimales; si no, `null`. */
function parseProductId(raw: string | undefined): number | null {
  if (raw === undefined || !/^[1-9]\d*$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
