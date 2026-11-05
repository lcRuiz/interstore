import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, concatMap, finalize, tap } from 'rxjs';
import type { Observable, Subscription } from 'rxjs';
import { toApiError, type ApiError } from '@core/api/api-error';
import type { Product } from '@features/catalog/data-access/catalog.types';
import { RewardsStore } from '@features/rewards/data-access/rewards-store';
import { LoadState } from '@shared/utils/load-state';
import { CartApi } from './cart-api';
import { MAX_QUANTITY, type Cart, type CartItem, type CartMutationResponse } from './cart.types';

const EMPTY_CART: Cart = { items: [], totalItems: 0, total: 0 };
const GENERIC_NOTICE = 'No pudimos actualizar tu carrito. Inténtalo de nuevo.';
/** Mensajes propios por `code`; nunca se muestra el `message` del servidor. */
const NOTICES: Record<string, string> = {
  OUT_OF_STOCK: 'Producto agotado',
  QUANTITY_EXCEEDS_STOCK: 'No hay más unidades disponibles',
};

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Operation {
  productId: number;
  request: () => Observable<CartMutationResponse>;
  /** Deshace el efecto optimista de esta operación. */
  rollback: () => void;
}

/**
 * Estado del carrito del usuario actual con actualización optimista.
 *
 * El servidor es la fuente de verdad: cada respuesta reemplaza el estado local (cuando no quedan
 * operaciones en vuelo, para no parpadear) y es la única que actualiza los puntos en
 * `RewardsStore`. Las operaciones de un mismo producto se ejecutan en orden.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly api = inject(CartApi);
  private readonly rewards = inject(RewardsStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cartState = signal<Cart>(EMPTY_CART);
  private readonly status = signal<LoadStatus>('idle');
  private readonly loadError = signal<ApiError | null>(null);
  private readonly noticeState = signal<string | null>(null);
  private readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  private readonly queues = new Map<number, Subject<Operation>>();
  private readonly pendingCounts = new Map<number, number>();
  private inflight = 0;
  private loading: Subscription | undefined;

  /** Carrito actual; provisional mientras haya operaciones en vuelo. */
  readonly cart = this.cartState.asReadonly();
  /** Unidades totales, para el indicador del header. */
  readonly totalItems = computed(() => this.cartState().totalItems);
  /** Estado de carga del carrito para las vistas (`empty` si no tiene líneas). */
  readonly state = computed<LoadState<Cart>>(() => {
    switch (this.status()) {
      case 'loading':
        return LoadState.loading;
      case 'error': {
        const error = this.loadError();
        return error ? LoadState.error(error) : LoadState.idle;
      }
      case 'ready':
        return LoadState.from(this.cartState(), (cart) => cart.items.length === 0);
      default:
        return LoadState.idle;
    }
  });
  /** Aviso del último error de una acción (mensaje propio por `code`), o `null`. */
  readonly notice = this.noticeState.asReadonly();

  /**
   * Carga el carrito (`GET /api/cart`). Una carga nueva cancela la anterior. La respuesta se
   * ignora si hay operaciones en vuelo: su propia respuesta traerá el estado más reciente.
   */
  load(): void {
    if (this.status() !== 'ready') this.status.set('loading');
    this.loading?.unsubscribe();
    this.loading = this.api
      .getCart()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (this.inflight === 0) this.cartState.set(response.data);
          this.status.set('ready');
        },
        error: (err: unknown) => {
          if (this.status() === 'ready') return; // refresco fallido: se conserva lo mostrado
          this.loadError.set(toApiError(err));
          this.status.set('error');
        },
      });
  }

  /** Indica si hay una operación en curso (o en cola) para el producto. */
  isPending(productId: number): boolean {
    return this.pendingIds().has(productId);
  }

  /**
   * Agrega unidades del producto (`POST /api/cart/items`).
   *
   * Refleja la línea de inmediato y revierte si la API falla. Si el servidor premia,
   * `RewardsStore` recibe `awarded` y `balance` de la respuesta.
   *
   * @param product Producto del catálogo (se necesita para pintar la línea provisional).
   * @param quantity Unidades a sumar, de 1 a 99.
   */
  add(product: Product, quantity = 1): void {
    if (!isValidQuantity(quantity)) return;
    this.mutate(
      product.id,
      (cart) => {
        const current = cart.items.find((i) => i.productId === product.id);
        const next = lineOf(product, Math.min(MAX_QUANTITY, (current?.quantity ?? 0) + quantity));
        return withItems(
          cart,
          current
            ? cart.items.map((i) => (i.productId === product.id ? next : i))
            : [...cart.items, next],
        );
      },
      () => this.api.addItem(product.id, quantity),
    );
  }

  /**
   * Fija la cantidad de una línea (`PATCH /api/cart/items/:productId`), de forma optimista.
   *
   * @param productId Id del producto de la línea.
   * @param quantity Cantidad final, entera de 1 a 99; otro valor se ignora.
   */
  setQuantity(productId: number, quantity: number): void {
    const line = this.cartState().items.find((i) => i.productId === productId);
    if (!line || !isValidQuantity(quantity)) return;
    this.mutate(
      productId,
      (cart) =>
        withItems(
          cart,
          cart.items.map((i) => (i.productId === productId ? lineOf(i.product, quantity) : i)),
        ),
      () => this.api.setQuantity(productId, quantity),
    );
  }

  /** Quita una línea (`DELETE /api/cart/items/:productId`), de forma optimista. */
  remove(productId: number): void {
    this.mutate(
      productId,
      (cart) =>
        withItems(
          cart,
          cart.items.filter((i) => i.productId !== productId),
        ),
      () => this.api.removeItem(productId),
    );
  }

  /** `true` si hay alguna operación del carrito en curso o en cola. */
  readonly hasPending = computed(() => this.pendingIds().size > 0);

  /**
   * Deja el carrito local vacío sin llamar a la API.
   *
   * Lo usa el checkout: al confirmar el pedido el servidor ya vació el carrito.
   */
  clear(): void {
    this.cartState.set(EMPTY_CART);
    this.status.set('ready');
  }

  /** Descarta el aviso actual. */
  dismissNotice(): void {
    this.noticeState.set(null);
  }

  private mutate(
    productId: number,
    apply: (cart: Cart) => Cart,
    request: () => Observable<CartMutationResponse>,
  ): void {
    const before = this.cartState();
    const index = before.items.findIndex((i) => i.productId === productId);
    const line = before.items[index];

    this.noticeState.set(null);
    this.cartState.set(apply(before));
    this.begin(productId);
    this.queueFor(productId).next({
      productId,
      request,
      rollback: () => {
        this.cartState.update((cart) => {
          const items = cart.items.filter((i) => i.productId !== productId);
          if (line) items.splice(Math.min(index, items.length), 0, line);
          return withItems(cart, items);
        });
      },
    });
  }

  private queueFor(productId: number): Subject<Operation> {
    let queue = this.queues.get(productId);
    if (!queue) {
      queue = new Subject<Operation>();
      queue
        .pipe(
          concatMap((op) => this.run(op)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe();
      this.queues.set(productId, queue);
    }
    return queue;
  }

  private run(op: Operation): Observable<never> {
    return op.request().pipe(
      tap({
        next: (response) => {
          this.rewards.applyRewards(response.rewards);
          if (this.inflight <= 1) this.cartState.set(response.data);
        },
        error: (err: unknown) => {
          op.rollback();
          this.noticeState.set(NOTICES[toApiError(err).code] ?? GENERIC_NOTICE);
        },
      }),
      catchError(() => EMPTY),
      finalize(() => {
        this.end(op.productId);
      }),
      concatMap(() => EMPTY),
    );
  }

  private begin(productId: number): void {
    this.inflight++;
    this.pendingCounts.set(productId, (this.pendingCounts.get(productId) ?? 0) + 1);
    this.pendingIds.set(new Set(this.pendingCounts.keys()));
  }

  private end(productId: number): void {
    this.inflight--;
    const left = (this.pendingCounts.get(productId) ?? 1) - 1;
    if (left <= 0) this.pendingCounts.delete(productId);
    else this.pendingCounts.set(productId, left);
    this.pendingIds.set(new Set(this.pendingCounts.keys()));
  }
}

function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
}

/** Línea provisional; el precio por cantidad es solo visual hasta que responda el servidor. */
function lineOf(product: Product, quantity: number): CartItem {
  return { productId: product.id, quantity, product, lineTotal: product.price * quantity };
}

function withItems(cart: Cart, items: CartItem[]): Cart {
  return {
    ...cart,
    items,
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    total: items.reduce((sum, i) => sum + i.lineTotal, 0),
  };
}
