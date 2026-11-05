import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import { CartStore } from '@features/cart/data-access/cart-store';
import type { Cart } from '@features/cart/data-access/cart.types';
import type { Product } from '@features/catalog/data-access/catalog.types';
import { RewardsStore } from '@features/rewards/data-access/rewards-store';
import { OrdersStore } from './orders-store';
import type { Order } from './orders.types';

const product: Product = {
  id: 1,
  name: 'Camisa',
  price: 2000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 10,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
};
const cartWithItems: Cart = {
  items: [{ productId: 1, quantity: 2, product, lineTotal: 4000 }],
  totalItems: 2,
  total: 4000,
};
const order: Order = {
  id: 42,
  status: 'confirmed',
  total: 4000,
  totalItems: 2,
  pointsAwarded: 10,
  createdAt: '2026-11-05T10:00:00.000Z',
  items: [{ productId: 1, name: 'Camisa', unitPrice: 2000, quantity: 2, lineTotal: 4000 }],
};

describe('OrdersStore', () => {
  let http: HttpTestingController;
  let store: OrdersStore;
  let cart: CartStore;
  let rewards: RewardsStore;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(OrdersStore);
    cart = TestBed.inject(CartStore);
    rewards = TestBed.inject(RewardsStore);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    cart.load();
    http.expectOne('/api/cart').flush({ data: cartWithItems });
  });

  afterEach(() => {
    http.verify();
  });

  const keyOf = (req: { request: { headers: { get(name: string): string | null } } }) =>
    req.request.headers.get('Idempotency-Key');
  const apiError = (status: number, code: string) => ({
    body: { error: { code, message: 'mensaje interno del servidor' } },
    opts: { status, statusText: 'Error' },
  });

  it('debe enviar POST /api/orders sin body con una Idempotency-Key válida', () => {
    store.checkout();

    const req = http.expectOne('/api/orders');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(keyOf(req)).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    req.flush(
      { data: order, rewards: { awarded: 10, balance: 10 } },
      { status: 201, statusText: 'Created' },
    );
  });

  it('debe marcar submitting mientras espera al servidor y no ser optimista', () => {
    store.checkout();

    expect(store.submitting()).toBe(true);
    expect(cart.totalItems()).toBe(2);
    http.expectOne('/api/orders').flush({ data: order, rewards: { awarded: 10, balance: 10 } });
    expect(store.submitting()).toBe(false);
  });

  it('debe enviar un solo POST aunque se llame dos veces mientras hay una petición en vuelo', () => {
    store.checkout();
    store.checkout();

    http.expectOne('/api/orders').flush({ data: order, rewards: { awarded: 10, balance: 10 } });
  });

  it('debe vaciar el carrito, aplicar el saldo y navegar al pedido tras el éxito', () => {
    store.checkout();
    http
      .expectOne('/api/orders')
      .flush(
        { data: order, rewards: { awarded: 10, balance: 35 } },
        { status: 201, statusText: 'Created' },
      );

    expect(cart.totalItems()).toBe(0);
    expect(cart.state().status).toBe('empty');
    expect(rewards.balance()).toBe(35);
    expect(rewards.lastAward()).toBe(10);
    expect(navigate).toHaveBeenCalledWith('/orders/42');
    expect(store.notice()).toBeNull();
  });

  it('debe mostrar pointsAwarded del pedido cuando es un replay 200 con rewards.awarded en 0', () => {
    store.checkout();
    http
      .expectOne('/api/orders')
      .flush(
        { data: order, rewards: { awarded: 0, balance: 35 } },
        { status: 200, statusText: 'OK' },
      );

    expect(rewards.lastAward()).toBe(10);
    expect(rewards.balance()).toBe(35);
    expect(navigate).toHaveBeenCalledWith('/orders/42');
  });

  it('debe conservar la misma Idempotency-Key al reintentar tras un error de red', () => {
    store.checkout();
    const first = http.expectOne('/api/orders');
    const key = keyOf(first);
    first.error(new ProgressEvent('error'));

    expect(store.canRetry()).toBe(true);
    expect(store.notice()).toBeTruthy();
    expect(cart.totalItems()).toBe(2);

    store.checkout();
    const second = http.expectOne('/api/orders');
    expect(keyOf(second)).toBe(key);
    second.flush(
      { data: order, rewards: { awarded: 0, balance: 10 } },
      { status: 200, statusText: 'OK' },
    );
  });

  it('debe conservar la misma clave tras un 5xx', () => {
    store.checkout();
    const first = http.expectOne('/api/orders');
    const key = keyOf(first);
    first.flush(null, { status: 503, statusText: 'Unavailable' });
    expect(store.canRetry()).toBe(true);

    store.checkout();
    const second = http.expectOne('/api/orders');
    expect(keyOf(second)).toBe(key);
    second.flush({ data: order, rewards: { awarded: 10, balance: 10 } });
  });

  it('debe usar una clave nueva en el siguiente checkout después de un éxito', () => {
    store.checkout();
    const first = http.expectOne('/api/orders');
    const key = keyOf(first);
    first.flush({ data: order, rewards: { awarded: 10, balance: 10 } });

    cart.load();
    http.expectOne('/api/cart').flush({ data: cartWithItems });
    store.checkout();
    const second = http.expectOne('/api/orders');
    expect(keyOf(second)).not.toBe(key);
    second.flush({ data: order, rewards: { awarded: 10, balance: 10 } });
  });

  it('debe avisar que el carrito está vacío y recargarlo con EMPTY_CART', () => {
    const { body, opts } = apiError(409, 'EMPTY_CART');
    store.checkout();
    http.expectOne('/api/orders').flush(body, opts);

    expect(store.notice()).toBe('Tu carrito está vacío');
    expect(store.canRetry()).toBe(false);
    http.expectOne('/api/cart').flush({ data: { items: [], totalItems: 0, total: 0 } });
    expect(cart.totalItems()).toBe(0);
  });

  it.each(['OUT_OF_STOCK', 'QUANTITY_EXCEEDS_STOCK'])(
    'debe avisar falta de stock y recargar el carrito desde el servidor con %s',
    (code) => {
      const { body, opts } = apiError(409, code);
      store.checkout();
      http.expectOne('/api/orders').flush(body, opts);

      expect(store.notice()).toBe(
        'Algunos productos ya no tienen stock suficiente. Revisa tu carrito.',
      );
      http.expectOne('/api/cart').flush({ data: { ...cartWithItems, totalItems: 1, total: 2000 } });
      expect(cart.totalItems()).toBe(1);
      expect(navigate).not.toHaveBeenCalled();
    },
  );

  it('debe usar una clave nueva tras un error 4xx definitivo', () => {
    store.checkout();
    const first = http.expectOne('/api/orders');
    const key = keyOf(first);
    const { body, opts } = apiError(409, 'OUT_OF_STOCK');
    first.flush(body, opts);
    http.expectOne('/api/cart').flush({ data: cartWithItems });

    store.checkout();
    const second = http.expectOne('/api/orders');
    expect(keyOf(second)).not.toBe(key);
    second.flush({ data: order, rewards: { awarded: 10, balance: 10 } });
  });

  it('debe mostrar un mensaje genérico propio con 401 y nunca el message del servidor', () => {
    const { body, opts } = apiError(401, 'UNKNOWN_USER');
    store.checkout();
    http.expectOne('/api/orders').flush(body, opts);

    expect(store.notice()).toBeTruthy();
    expect(store.notice()).not.toContain('mensaje interno');
    expect(store.canRetry()).toBe(false);
  });

  it('debe descartar el aviso con dismissNotice', () => {
    store.checkout();
    http.expectOne('/api/orders').flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.notice()).not.toBeNull();

    store.dismissNotice();

    expect(store.notice()).toBeNull();
  });
});
