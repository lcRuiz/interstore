import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '@core/api/api-error';
import { CatalogStore } from './catalog-store';
import type { Product, ProductQuery } from './catalog.types';

const product = (id: number): Product => ({
  id,
  name: 'Producto ' + id,
  price: 100000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 5,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
});
const query = (over: Partial<ProductQuery> = {}): ProductQuery => ({
  page: 1,
  pageSize: 12,
  sort: 'newest',
  ...over,
});
const meta = (total: number, page = 1) => ({
  page,
  pageSize: 12,
  total,
  totalPages: Math.ceil(total / 12),
});
const serverError = { error: { code: 'INTERNAL_ERROR', message: 'Error interno' } };

describe('CatalogStore', () => {
  let store: CatalogStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CatalogStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('debe empezar en idle sin metadatos ni categorías', () => {
    expect(store.state().status).toBe('idle');
    expect(store.meta()).toBeNull();
    expect(store.categories()).toEqual([]);
  });

  it('debe pasar a loading y luego a success con los productos y el meta', () => {
    store.load(query());

    expect(store.state().status).toBe('loading');
    http
      .expectOne((r) => r.url === '/api/products')
      .flush({ data: [product(1), product(2)], meta: meta(2) });

    const state = store.state();
    expect(state.status).toBe('success');
    expect(state.status === 'success' && state.data.map((p) => p.id)).toEqual([1, 2]);
    expect(store.meta()).toEqual(meta(2));
  });

  it('debe quedar en empty y conservar el meta cuando la página no tiene productos', () => {
    store.load(query({ page: 9 }));

    http.expectOne((r) => r.url === '/api/products').flush({ data: [], meta: meta(24, 9) });

    expect(store.state().status).toBe('empty');
    expect(store.meta()?.total).toBe(24);
  });

  it('debe quedar en error con un ApiError reintentable cuando el servidor responde 500', () => {
    store.load(query());

    http
      .expectOne((r) => r.url === '/api/products')
      .flush(serverError, { status: 500, statusText: 'Server Error' });

    const state = store.state();
    expect(state.status).toBe('error');
    const error = (state as { error: ApiError }).error;
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.retryable).toBe(true);
  });

  it('debe cancelar la petición anterior cuando llega una consulta nueva', () => {
    store.load(query({ q: 'a' }));
    const first = http.expectOne((r) => r.params.get('q') === 'a');
    store.load(query({ q: 'ab' }));

    expect(first.cancelled).toBe(true);
    http.expectOne((r) => r.params.get('q') === 'ab').flush({ data: [], meta: meta(0) });
  });

  it('debe ignorar la respuesta vieja y quedarse con la de la consulta más reciente', () => {
    store.load(query({ q: 'a' }));
    const first = http.expectOne((r) => r.params.get('q') === 'a');
    store.load(query({ q: 'ab' }));
    const second = http.expectOne((r) => r.params.get('q') === 'ab');

    second.flush({ data: [product(2)], meta: meta(1) });
    // HttpTestingController no deja responder una petición cancelada: la respuesta vieja no llega.
    expect(first.cancelled).toBe(true);

    const state = store.state();
    expect(state.status === 'success' && state.data.map((p) => p.id)).toEqual([2]);
  });

  it('debe repetir la última consulta cuando se llama reload', () => {
    store.load(query({ category: 'ropa', page: 2 }));
    http
      .expectOne((r) => r.url === '/api/products')
      .flush(serverError, { status: 500, statusText: 'Server Error' });

    store.reload();

    expect(store.state().status).toBe('loading');
    const retry = http.expectOne((r) => r.url === '/api/products');
    expect(retry.request.params.get('category')).toBe('ropa');
    expect(retry.request.params.get('page')).toBe('2');
    retry.flush({ data: [product(1)], meta: meta(13, 2) });
  });

  it('debe ignorar reload cuando todavía no hubo ninguna consulta', () => {
    store.reload();

    http.expectNone((r) => r.url === '/api/products');
    expect(store.state().status).toBe('idle');
  });

  it('debe cargar las categorías una sola vez', () => {
    store.loadCategories();
    store.loadCategories();

    http.expectOne('/api/categories').flush({ data: [{ slug: 'ropa', name: 'Ropa' }] });
    store.loadCategories();

    expect(store.categories()).toEqual([{ slug: 'ropa', name: 'Ropa' }]);
  });

  it('debe dejar las categorías vacías cuando falla la carga', () => {
    store.loadCategories();

    http.expectOne('/api/categories').flush(serverError, { status: 500, statusText: 'Error' });

    expect(store.categories()).toEqual([]);
  });
});
