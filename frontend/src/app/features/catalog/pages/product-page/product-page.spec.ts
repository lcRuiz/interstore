import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsCO from '@angular/common/locales/es-CO';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import type { Product } from '../../data-access/catalog.types';
import { ProductPage } from './product-page';

registerLocaleData(localeEsCO);

const product = (over: Partial<Product> = {}): Product => ({
  id: 5,
  name: 'Zapatillas',
  price: 189900,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 4,
  pointsMultiplier: 2,
  category: { slug: 'calzado', name: 'Calzado' },
  ...over,
});

describe('ProductPage', () => {
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

  async function create(id: string) {
    const fixture = TestBed.createComponent(ProductPage);
    fixture.componentRef.setInput('id', id);
    const root = fixture.nativeElement as HTMLElement;
    const q = (testId: string) => root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    await fixture.whenStable();
    return { fixture, root, q };
  }

  it('debe mostrar el esqueleto mientras carga y pedir GET /api/products/:id', async () => {
    const { fixture, q } = await create('5');
    await fixture.whenStable();

    expect(q('product-skeleton')).not.toBeNull();
    http.expectOne('/api/products/5').flush({ data: product() });
  });

  it.each(['abc', '0', '-3', '1.5', '', '7x'])(
    'debe mostrar «Producto no encontrado» sin llamar a la API cuando el id es «%s»',
    async (id) => {
      const { fixture, root } = await create(id);
      await fixture.whenStable();

      expect(root.textContent).toContain('Producto no encontrado');
    },
  );

  it('debe mostrar «Producto no encontrado» con enlace al catálogo ante PRODUCT_NOT_FOUND', async () => {
    const { fixture, root } = await create('5');
    http
      .expectOne('/api/products/5')
      .flush(
        { error: { code: 'PRODUCT_NOT_FOUND', message: 'x' } },
        { status: 404, statusText: 'Not Found' },
      );
    await fixture.whenStable();

    expect(root.textContent).toContain('Producto no encontrado');
    expect(root.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('debe mostrar error con Reintentar ante un 500 y volver a pedir el producto', async () => {
    const { fixture, root } = await create('5');
    http.expectOne('/api/products/5').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    const retry = [...root.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Reintentar'),
    );
    expect(retry).toBeDefined();
    retry?.click();

    http.expectOne('/api/products/5').flush({ data: product() });
  });

  it('debe mostrar nombre, categoría, precio e insignia Puntos x2', async () => {
    const { fixture, root, q } = await create('5');
    http.expectOne('/api/products/5').flush({ data: product() });
    await fixture.whenStable();

    expect(q('name')?.textContent).toContain('Zapatillas');
    expect(q('category')?.textContent).toContain('Calzado');
    expect(q('price')?.textContent).toContain('189.900');
    expect(q('points-badge')?.textContent).toContain('Puntos x2');
    expect(root.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('debe ofrecer cantidades de 1 a min(stock, 99)', async () => {
    const { fixture, q } = await create('5');
    http.expectOne('/api/products/5').flush({ data: product({ stock: 4 }) });
    await fixture.whenStable();

    expect(q('quantity')?.querySelectorAll('option')).toHaveLength(4);
  });

  it('debe limitar el selector a 99 aunque haya más stock', async () => {
    const { fixture, q } = await create('5');
    http.expectOne('/api/products/5').flush({ data: product({ stock: 500 }) });
    await fixture.whenStable();

    expect(q('quantity')?.querySelectorAll('option')).toHaveLength(99);
  });

  it('debe mostrar Agotado y deshabilitar «Agregar al carrito» sin stock', async () => {
    const { fixture, q } = await create('5');
    http.expectOne('/api/products/5').flush({ data: product({ stock: 0 }) });
    await fixture.whenStable();

    expect(q('sold-out')).not.toBeNull();
    expect(q('add-to-cart') as HTMLButtonElement).toHaveProperty('disabled', true);
  });

  it('debe agregar la cantidad elegida y anunciar los puntos ganados', async () => {
    const { fixture, q } = await create('5');
    http.expectOne('/api/products/5').flush({ data: product() });
    await fixture.whenStable();
    const select = q('quantity') as HTMLSelectElement;
    select.value = '3';
    select.dispatchEvent(new Event('change'));

    q('add-to-cart')?.click();
    await fixture.whenStable();
    expect(q('add-to-cart') as HTMLButtonElement).toHaveProperty('disabled', true);

    const req = http.expectOne('/api/cart/items');
    expect(req.request.body).toEqual({ productId: 5, quantity: 3 });
    req.flush({
      data: { items: [], totalItems: 3, total: 569700 },
      rewards: { awarded: 10, balance: 60 },
    });
    await fixture.whenStable();

    expect(q('points-message')?.textContent).toContain('+10');
    expect(q('points-message')?.getAttribute('aria-live')).toBe('polite');
    expect(q('add-to-cart') as HTMLButtonElement).toHaveProperty('disabled', false);
  });
});
