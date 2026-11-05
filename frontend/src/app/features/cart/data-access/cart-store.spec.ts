import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import type { Product } from '@features/catalog/data-access/catalog.types';
import { RewardsStore } from '@features/rewards/data-access/rewards-store';
import { CartStore } from './cart-store';
import type { Cart } from './cart.types';

const product = (id: number, over: Partial<Product> = {}): Product => ({
  id,
  name: 'Producto ' + id,
  price: 1000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 10,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
  ...over,
});
const cartOf = (...lines: [Product, number][]): Cart => ({
  items: lines.map(([p, q]) => ({
    productId: p.id,
    quantity: q,
    product: p,
    lineTotal: p.price * q,
  })),
  totalItems: lines.reduce((n, [, q]) => n + q, 0),
  total: lines.reduce((n, [p, q]) => n + p.price * q, 0),
});
const failure = (code: string, status = 409) => ({
  body: { error: { code, message: 'mensaje del servidor' } },
  opts: { status, statusText: 'Error' },
});

describe('CartStore', () => {
  let store: CartStore;
  let rewards: RewardsStore;
  let http: HttpTestingController;
  const p1 = product(1);
  const p2 = product(2, { price: 2000 });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(CartStore);
    rewards = TestBed.inject(RewardsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  /** Deja el carrito del store con el contenido dado (respuesta de GET /api/cart). */
  function seed(cart: Cart): void {
    store.load();
    http.expectOne('/api/cart').flush({ data: cart });
  }

  describe('carga', () => {
    it('debe pasar a loading y luego a success con el carrito del servidor', () => {
      store.load();
      expect(store.state().status).toBe('loading');

      http.expectOne('/api/cart').flush({ data: cartOf([p1, 2]) });

      const state = store.state();
      expect(state.status).toBe('success');
      expect(store.totalItems()).toBe(2);
    });

    it('debe quedar en empty cuando el carrito no tiene líneas', () => {
      seed(cartOf());

      expect(store.state().status).toBe('empty');
    });

    it('debe quedar en error con ApiError cuando falla la carga', () => {
      store.load();
      http.expectOne('/api/cart').flush(null, { status: 500, statusText: 'Server Error' });

      const state = store.state();
      expect(state.status).toBe('error');
      if (state.status === 'error') expect(state.error.retryable).toBe(true);
    });
  });

  describe('agregar', () => {
    it('debe reflejar la línea de inmediato y enviar POST con productId y quantity', () => {
      seed(cartOf());

      store.add(p1, 3);

      expect(store.cart().items).toHaveLength(1);
      expect(store.totalItems()).toBe(3);
      const req = http.expectOne('/api/cart/items');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ productId: 1, quantity: 3 });
      req.flush({ data: cartOf([p1, 3]), rewards: { awarded: 0, balance: 0 } });
    });

    it('debe sumar a la línea existente de forma optimista', () => {
      seed(cartOf([p1, 1]));

      store.add(p1);

      expect(store.cart().items).toHaveLength(1);
      expect(store.cart().items[0]?.quantity).toBe(2);
      http
        .expectOne('/api/cart/items')
        .flush({ data: cartOf([p1, 2]), rewards: { awarded: 0, balance: 0 } });
    });

    it('debe reemplazar el estado provisional por el carrito del servidor', () => {
      seed(cartOf());
      store.add(p1);

      const server = cartOf([p1, 1]);
      server.total = 1234; // el servidor es la fuente de verdad
      http
        .expectOne('/api/cart/items')
        .flush({ data: server, rewards: { awarded: 0, balance: 0 } });

      expect(store.cart().total).toBe(1234);
    });

    it('debe marcar el producto como pendiente hasta que responde la API', () => {
      seed(cartOf());
      store.add(p1);
      expect(store.isPending(1)).toBe(true);

      http
        .expectOne('/api/cart/items')
        .flush({ data: cartOf([p1, 1]), rewards: { awarded: 0, balance: 0 } });

      expect(store.isPending(1)).toBe(false);
    });
  });

  describe('cambiar cantidad y quitar', () => {
    it('debe cambiar la cantidad de inmediato y enviar PATCH', () => {
      seed(cartOf([p1, 1]));

      store.setQuantity(1, 4);

      expect(store.cart().items[0]?.quantity).toBe(4);
      expect(store.totalItems()).toBe(4);
      const req = http.expectOne('/api/cart/items/1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ quantity: 4 });
      req.flush({ data: cartOf([p1, 4]), rewards: { awarded: 0, balance: 0 } });
    });

    it('debe quitar la línea de inmediato y enviar DELETE', () => {
      seed(cartOf([p1, 1], [p2, 2]));

      store.remove(1);

      expect(store.cart().items.map((i) => i.productId)).toEqual([2]);
      const req = http.expectOne('/api/cart/items/1');
      expect(req.request.method).toBe('DELETE');
      req.flush({ data: cartOf([p2, 2]), rewards: { awarded: 0, balance: 0 } });
    });
  });

  describe('rollback', () => {
    it('debe volver al estado previo y avisar «Producto agotado» ante OUT_OF_STOCK', () => {
      const before = cartOf([p2, 1]);
      seed(before);
      store.add(p1);

      const f = failure('OUT_OF_STOCK');
      http.expectOne('/api/cart/items').flush(f.body, f.opts);

      expect(store.cart()).toEqual(before);
      expect(store.notice()).toBe('Producto agotado');
      expect(store.isPending(1)).toBe(false);
    });

    it('debe avisar «No hay más unidades disponibles» ante QUANTITY_EXCEEDS_STOCK', () => {
      const before = cartOf([p1, 2]);
      seed(before);
      store.setQuantity(1, 9);

      const f = failure('QUANTITY_EXCEEDS_STOCK');
      http.expectOne('/api/cart/items/1').flush(f.body, f.opts);

      expect(store.cart()).toEqual(before);
      expect(store.notice()).toBe('No hay más unidades disponibles');
    });

    it('debe restaurar la línea quitada y usar un mensaje propio (no el del servidor) en otros errores', () => {
      const before = cartOf([p1, 2]);
      seed(before);
      store.remove(1);

      const f = failure('INTERNAL_ERROR', 500);
      http.expectOne('/api/cart/items/1').flush(f.body, f.opts);

      expect(store.cart()).toEqual(before);
      expect(store.notice()).toBeTruthy();
      expect(store.notice()).not.toContain('mensaje del servidor');
    });

    it('debe permitir descartar el aviso', () => {
      seed(cartOf());
      store.add(p1);
      const f = failure('OUT_OF_STOCK');
      http.expectOne('/api/cart/items').flush(f.body, f.opts);

      store.dismissNotice();

      expect(store.notice()).toBeNull();
    });
  });

  describe('serialización por producto', () => {
    it('debe enviar la segunda operación solo cuando termina la primera', () => {
      seed(cartOf());

      store.add(p1);
      store.add(p1);

      expect(store.cart().items[0]?.quantity).toBe(2); // optimista inmediato
      const first = http.expectOne('/api/cart/items');
      http.expectNone('/api/cart/items'); // la segunda aún no sale
      first.flush({ data: cartOf([p1, 1]), rewards: { awarded: 10, balance: 10 } });

      const second = http.expectOne('/api/cart/items');
      second.flush({ data: cartOf([p1, 2]), rewards: { awarded: 0, balance: 10 } });
      expect(store.cart().items[0]?.quantity).toBe(2);
      expect(store.isPending(1)).toBe(false);
    });

    it('debe no bloquear operaciones de productos distintos', () => {
      seed(cartOf());

      store.add(p1);
      store.add(p2);

      const reqs = http.match('/api/cart/items');
      expect(reqs).toHaveLength(2);
      reqs[0]?.flush({ data: cartOf([p1, 1]), rewards: { awarded: 0, balance: 0 } });
      reqs[1]?.flush({ data: cartOf([p1, 1], [p2, 1]), rewards: { awarded: 0, balance: 0 } });
      expect(store.totalItems()).toBe(2);
    });
  });

  describe('puntos', () => {
    it('debe actualizar saldo y premio solo con lo que responde el servidor', () => {
      seed(cartOf());
      store.add(p1);
      expect(rewards.balance()).toBeNull(); // nada optimista
      expect(rewards.lastAward()).toBe(0);

      http
        .expectOne('/api/cart/items')
        .flush({ data: cartOf([p1, 1]), rewards: { awarded: 10, balance: 60 } });

      expect(rewards.balance()).toBe(60);
      expect(rewards.lastAward()).toBe(10);
    });

    it('debe dejar los puntos intactos cuando la operación falla', () => {
      seed(cartOf());
      rewards.applyRewards({ awarded: 0, balance: 50 });
      store.add(p1);

      const f = failure('OUT_OF_STOCK');
      http.expectOne('/api/cart/items').flush(f.body, f.opts);

      expect(rewards.balance()).toBe(50);
      expect(rewards.lastAward()).toBe(0);
    });
  });
});
