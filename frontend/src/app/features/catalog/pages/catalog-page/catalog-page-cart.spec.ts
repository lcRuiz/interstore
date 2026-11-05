import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsCO from '@angular/common/locales/es-CO';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Product } from '../../data-access/catalog.types';
import { CatalogPage } from './catalog-page';

registerLocaleData(localeEsCO);

const product = (id: number, stock = 5): Product => ({
  id,
  name: 'Producto ' + id,
  price: 1000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
});

describe('CatalogPage · carrito y detalle', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  const root = () => harness.fixture.nativeElement as HTMLElement;
  const addButtons = () =>
    Array.from(root().querySelectorAll<HTMLButtonElement>('[data-testid="quick-add"]'));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: CatalogPage }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es-CO' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'COP' },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', CatalogPage);
    await harness.fixture.whenStable();
    http.match('/api/categories').forEach((r) => r.flush({ data: [] }));
    http
      .expectOne((r) => r.url === '/api/products')
      .flush({
        data: [product(1), product(2, 0)],
        meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 },
      });
    await harness.fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
  });

  it('debe enlazar el nombre de cada tarjeta al detalle del producto', () => {
    expect(root().querySelector('a[href="/products/1"]')).not.toBeNull();
    expect(root().querySelector('a[href="/products/2"]')).not.toBeNull();
  });

  it('debe agregar una unidad al pulsar «Agregar» en la tarjeta', () => {
    addButtons()[0]?.click();

    const req = http.expectOne('/api/cart/items');
    expect(req.request.body).toEqual({ productId: 1, quantity: 1 });
    req.flush({
      data: { items: [], totalItems: 1, total: 1000 },
      rewards: { awarded: 0, balance: 0 },
    });
  });

  it('debe deshabilitar «Agregar» en un producto agotado', () => {
    expect(addButtons()[1]?.disabled).toBe(true);
  });
});
