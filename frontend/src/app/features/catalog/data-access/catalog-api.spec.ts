import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '@core/api/api-error';
import { apiErrorInterceptor } from '@core/api/api-error.interceptor';
import { CatalogApi } from './catalog-api';
import type { Category, Product } from './catalog.types';

const product: Product = {
  id: 1,
  name: 'Chaqueta',
  price: 249900,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 3,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
};
const meta = { page: 1, pageSize: 12, total: 1, totalPages: 1 };

describe('CatalogApi', () => {
  let api: CatalogApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(CatalogApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe enviar page, pageSize, category, q y sort como query params', async () => {
    const result = firstValueFrom(
      api.listProducts({ page: 2, pageSize: 12, category: 'ropa', q: 'merino', sort: 'price' }),
    );

    const req = http.expectOne((r) => r.url === '/api/products');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('12');
    expect(req.request.params.get('category')).toBe('ropa');
    expect(req.request.params.get('q')).toBe('merino');
    expect(req.request.params.get('sort')).toBe('price');
    req.flush({ data: [product], meta });
    expect(await result).toEqual({ data: [product], meta });
  });

  it('debe omitir category y q cuando no están definidos', () => {
    api.listProducts({ page: 1, pageSize: 12, sort: 'newest' }).subscribe();

    const req = http.expectOne((r) => r.url === '/api/products');
    expect(req.request.params.has('category')).toBe(false);
    expect(req.request.params.has('q')).toBe(false);
    req.flush({ data: [], meta });
  });

  it('debe codificar q sin permitir que inyecte otros parámetros', () => {
    api.listProducts({ page: 1, pageSize: 12, q: 'a&sort=name', sort: 'price' }).subscribe();

    const req = http.expectOne((r) => r.url === '/api/products');
    expect(req.request.params.get('q')).toBe('a&sort=name');
    expect(req.request.params.get('sort')).toBe('price');
    expect(req.request.urlWithParams).toContain('q=a%26sort');
    expect(req.request.urlWithParams.match(/[?&]sort=/g)).toHaveLength(1);
    req.flush({ data: [], meta });
  });

  it('debe devolver las categorías de /api/categories', async () => {
    const categories: Category[] = [{ slug: 'ropa', name: 'Ropa' }];
    const result = firstValueFrom(api.listCategories());

    const req = http.expectOne('/api/categories');
    expect(req.request.method).toBe('GET');
    req.flush({ data: categories });
    expect(await result).toEqual(categories);
  });

  it('debe propagar un ApiError cuando el servidor responde 400', async () => {
    const failure = firstValueFrom(
      api.listProducts({ page: 1, pageSize: 12, sort: 'newest' }),
    ).catch((e: unknown) => e);

    http
      .expectOne((r) => r.url === '/api/products')
      .flush(
        { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } },
        { status: 400, statusText: 'Bad Request' },
      );

    const error = await failure;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('VALIDATION_ERROR');
  });
});
