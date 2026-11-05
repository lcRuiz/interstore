import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsCO from '@angular/common/locales/es-CO';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import type { Order } from '../../data-access/orders.types';
import { OrderPage } from './order-page';

registerLocaleData(localeEsCO);

const order = (pointsAwarded: number): Order => ({
  id: 42,
  status: 'confirmed',
  total: 12345, // distinto de la suma de líneas: se debe mostrar el del servidor
  totalItems: 3,
  pointsAwarded,
  createdAt: '2026-11-05T10:00:00.000Z',
  items: [
    { productId: 1, name: 'Camisa Norte', unitPrice: 2000, quantity: 2, lineTotal: 4000 },
    { productId: 2, name: 'Gorra Sur', unitPrice: 8000, quantity: 1, lineTotal: 8000 },
  ],
});

describe('OrderPage', () => {
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

  async function create(id: string | undefined) {
    const fixture = TestBed.createComponent(OrderPage);
    fixture.componentRef.setInput('id', id);
    const root = fixture.nativeElement as HTMLElement;
    await fixture.whenStable(); // ejecuta el effect que dispara la carga
    return {
      fixture,
      root,
      q: (testId: string) => root.querySelector<HTMLElement>(`[data-testid="${testId}"]`),
    };
  }

  it.each(['abc', '0', '-1', '1.5', '01', ''])(
    'debe mostrar «Pedido no encontrado» sin llamar a la API cuando el id es «%s»',
    async (id) => {
      const { fixture, root } = await create(id);
      await fixture.whenStable();

      expect(root.textContent).toContain('Pedido no encontrado');
    },
  );

  it('debe mostrar el esqueleto mientras carga', async () => {
    const { fixture, q } = await create('42');
    await fixture.whenStable();

    expect(q('order-skeleton')).not.toBeNull();
    http.expectOne('/api/orders/42').flush({ data: order(10) });
  });

  it('debe mostrar el pedido con número, líneas y el total del servidor', async () => {
    const { fixture, root, q } = await create('42');
    http.expectOne('/api/orders/42').flush({ data: order(10) });
    await fixture.whenStable();

    expect(root.querySelector('h1')?.textContent).toContain('¡Pedido confirmado!');
    expect(q('order-number')?.textContent).toContain('42');
    expect(root.querySelectorAll('[data-testid="order-line"]')).toHaveLength(2);
    expect(root.textContent).toContain('Camisa Norte');
    expect(root.textContent).toContain('8.000');
    expect(q('order-total')?.textContent).toContain('12.345');
  });

  it('debe anunciar los puntos ganados en una región aria-live polite', async () => {
    const { fixture, q } = await create('42');
    http.expectOne('/api/orders/42').flush({ data: order(10) });
    await fixture.whenStable();

    expect(q('order-points')?.textContent).toContain('Ganaste 10 puntos');
    expect(q('order-points-live')?.getAttribute('aria-live')).toBe('polite');
  });

  it('debe omitir el mensaje de puntos cuando el pedido no otorgó puntos', async () => {
    const { fixture, root, q } = await create('42');
    http.expectOne('/api/orders/42').flush({ data: order(0) });
    await fixture.whenStable();

    expect(root.textContent).not.toContain('Ganaste');
    expect(q('order-points')).toBeNull();
  });

  it('debe ofrecer «Seguir comprando» y «Ver carrito»', async () => {
    const { fixture, root } = await create('42');
    http.expectOne('/api/orders/42').flush({ data: order(10) });
    await fixture.whenStable();

    expect(root.querySelector('a[href="/"]')?.textContent).toContain('Seguir comprando');
    expect(root.querySelector('a[href="/cart"]')?.textContent).toContain('Ver carrito');
  });

  it('debe mostrar «Pedido no encontrado» ante 404 ORDER_NOT_FOUND', async () => {
    const { fixture, root } = await create('99');
    http
      .expectOne('/api/orders/99')
      .flush(
        { error: { code: 'ORDER_NOT_FOUND', message: 'x' } },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(root.textContent).toContain('Pedido no encontrado');
  });

  it('debe mostrar el error y reintentar cuando es reintentable', async () => {
    const { fixture, root } = await create('42');
    http.expectOne('/api/orders/42').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const retry = [...root.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Reintentar'),
    );
    expect(retry).toBeDefined();
    retry?.click();

    http.expectOne('/api/orders/42').flush({ data: order(10) });
  });
});
