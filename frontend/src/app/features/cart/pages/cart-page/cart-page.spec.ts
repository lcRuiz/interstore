import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsCO from '@angular/common/locales/es-CO';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import type { Product } from '@features/catalog/data-access/catalog.types';
import type { Cart } from '../../data-access/cart.types';
import { CartPage } from './cart-page';

registerLocaleData(localeEsCO);

const product = (id: number): Product => ({
  id,
  name: 'Producto ' + id,
  price: 2000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 10,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
});
const cart = (n: number): Cart => ({
  items: Array.from({ length: n }, (_, i) => ({
    productId: i + 1,
    quantity: 2,
    product: product(i + 1),
    lineTotal: 4000,
  })),
  totalItems: n * 2,
  total: 12345, // distinto de la suma local: se debe mostrar el del servidor
});

describe('CartPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-CO' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'COP' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function create() {
    const fixture = TestBed.createComponent(CartPage);
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      root,
      q: (id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`),
    };
  }

  it('debe mostrar el esqueleto mientras carga', async () => {
    const { fixture, q } = create();
    await fixture.whenStable();

    expect(q('cart-skeleton')).not.toBeNull();
    http.expectOne('/api/cart').flush({ data: cart(0) });
  });

  it('debe mostrar el mensaje de carrito vacío con enlace al catálogo', async () => {
    const { fixture, root } = create();
    http.expectOne('/api/cart').flush({ data: cart(0) });
    await fixture.whenStable();

    expect(root.textContent).toContain('Tu carrito está vacío');
    expect(root.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('debe mostrar las líneas y el total que informa el servidor', async () => {
    const { fixture, root, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(2) });
    await fixture.whenStable();

    expect(root.querySelectorAll('app-cart-line')).toHaveLength(2);
    expect(q('cart-total')?.textContent).toContain('12.345');
  });

  it('debe mostrar el error y permitir reintentar cuando es reintentable', async () => {
    const { fixture, root } = create();
    http.expectOne('/api/cart').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const retry = [...root.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Reintentar'),
    );
    expect(retry).toBeDefined();
    retry?.click();

    http.expectOne('/api/cart').flush({ data: cart(1) });
  });

  it('debe cambiar la cantidad al pulsar «+» y enviar PATCH', async () => {
    const { fixture, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(1) });
    await fixture.whenStable();

    q('inc')?.click();

    const req = http.expectOne('/api/cart/items/1');
    expect(req.request.body).toEqual({ quantity: 3 });
    req.flush({ data: cart(1), rewards: { awarded: 0, balance: 0 } });
  });

  it('debe habilitar «Confirmar pedido» con líneas y enviar POST /api/orders al pulsarlo', async () => {
    const { fixture, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(1) });
    await fixture.whenStable();

    const button = q('checkout') as HTMLButtonElement | null;
    expect(button?.textContent).toContain('Confirmar pedido');
    expect(button?.disabled).toBe(false);
    button?.click();

    const sent = http.match('/api/orders');
    sent.forEach((req) => {
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.request.headers.has('Idempotency-Key')).toBe(true);
  });

  it('debe mostrar «Confirmando…» y deshabilitar el botón mientras se envía el pedido', async () => {
    const { fixture, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(1) });
    await fixture.whenStable();

    q('checkout')?.click();
    await fixture.whenStable();

    const button = q('checkout') as HTMLButtonElement | null;
    const label = button?.textContent;
    const disabled = button?.disabled;
    http.match('/api/orders').forEach((req) => {
      req.flush(null, { status: 500, statusText: 'Server Error' });
    });

    // Se afirma después de vaciar las peticiones para no dejar abiertas ante un fallo.
    expect(label).toContain('Confirmando…');
    expect(disabled).toBe(true);
  });

  it('debe deshabilitar «Confirmar pedido» mientras hay una operación del carrito en vuelo', async () => {
    const { fixture, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(1) });
    await fixture.whenStable();

    q('inc')?.click();
    await fixture.whenStable();

    const disabled = (q('checkout') as HTMLButtonElement | null)?.disabled;
    http
      .expectOne('/api/cart/items/1')
      .flush({ data: cart(1), rewards: { awarded: 0, balance: 0 } });

    expect(disabled).toBe(true);
  });

  it('debe anunciar el aviso de error del checkout en una región aria-live', async () => {
    const { fixture, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(1) });
    await fixture.whenStable();
    q('checkout')?.click();

    http.expectOne('/api/orders').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(q('checkout-notice')?.getAttribute('aria-live')).toBe('polite');
    expect(q('checkout-notice')?.textContent?.trim()).not.toBe('');
    expect(q('checkout')?.textContent).toContain('Reintentar');
  });

  it('debe anunciar el aviso de error de una acción y revertir', async () => {
    const { fixture, q } = create();
    http.expectOne('/api/cart').flush({ data: cart(1) });
    await fixture.whenStable();
    q('inc')?.click();

    http
      .expectOne('/api/cart/items/1')
      .flush(
        { error: { code: 'QUANTITY_EXCEEDS_STOCK', message: 'x' } },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(q('cart-notice')?.textContent).toContain('No hay más unidades disponibles');
    expect(q('cart-notice')?.getAttribute('aria-live')).toBe('polite');
  });
});
