import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsCO from '@angular/common/locales/es-CO';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Product } from '../../data-access/catalog.types';
import { CatalogPage } from './catalog-page';

registerLocaleData(localeEsCO);

const product = (id: number, over: Partial<Product> = {}): Product => ({
  id,
  name: 'Producto ' + id,
  price: 100000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 5,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
  ...over,
});
const meta = (total: number, page = 1) => ({
  page,
  pageSize: 12,
  total,
  totalPages: Math.ceil(total / 12),
});
const categories = [
  { slug: 'accesorios', name: 'Accesorios' },
  { slug: 'ropa', name: 'Ropa' },
];

describe('CatalogPage', () => {
  let http: HttpTestingController;
  let router: Router;
  let harness: RouterTestingHarness;

  const root = () => harness.fixture.nativeElement as HTMLElement;
  const q = (sel: string) => root().querySelector<HTMLElement>(sel);
  const qa = (sel: string) => Array.from(root().querySelectorAll<HTMLElement>(sel));
  const control = <T extends HTMLElement>(label: string) => {
    const l = qa('label').find((x) => x.textContent.trim() === label) as HTMLLabelElement;
    return root().querySelector<T>('#' + l.htmlFor)!;
  };
  const button = (label: string) => qa('button').find((b) => b.textContent.trim() === label);
  const productsReq = () => http.expectOne((r) => r.url === '/api/products');
  const url = () => new URL(router.url, 'http://localhost');
  const settle = () => harness.fixture.whenStable();

  async function open(path: string, answerCategories = true) {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(path, CatalogPage);
    await settle();
    if (answerCategories) {
      http.match('/api/categories').forEach((req) => req.flush({ data: categories }));
    }
    await settle();
  }

  async function openWithData(path: string, total = 30, page = 1) {
    await open(path);
    productsReq().flush({ data: [product(1), product(2)], meta: meta(total, page) });
    await settle();
  }

  beforeEach(() => {
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
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
  });

  describe('consulta al servidor', () => {
    it('debe pedir la primera página con los valores por defecto cuando la URL no tiene filtros', async () => {
      await open('/');

      const req = productsReq();
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('pageSize')).toBe('12');
      expect(req.request.params.get('sort')).toBe('newest');
      expect(req.request.params.has('category')).toBe(false);
      expect(req.request.params.has('q')).toBe(false);
      req.flush({ data: [], meta: meta(0) });
    });

    it('debe leer category, q, sort y page de la URL y enviarlos al servidor', async () => {
      await open('/?category=ropa&q=merino&sort=price&page=2');

      const req = productsReq();
      expect(req.request.params.get('category')).toBe('ropa');
      expect(req.request.params.get('q')).toBe('merino');
      expect(req.request.params.get('sort')).toBe('price');
      expect(req.request.params.get('page')).toBe('2');
      req.flush({ data: [], meta: meta(0) });
    });

    it('debe normalizar los parámetros inválidos de la URL antes de llamar a la API', async () => {
      await open('/?page=abc&sort=hack&category=A%20B');

      const req = productsReq();
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('sort')).toBe('newest');
      expect(req.request.params.has('category')).toBe(false);
      req.flush({ data: [], meta: meta(0) });
    });

    it('debe pedir las categorías para el filtro', async () => {
      await open('/', false);
      http.expectOne('/api/categories').flush({ data: categories });
      productsReq().flush({ data: [product(1)], meta: meta(1) });
      await settle();

      const options = qa('select option').map((o) => o.textContent.trim());
      expect(options).toContain('Todas');
      expect(options).toContain('Accesorios');
    });

    it('debe seguir funcionando cuando falla la carga de categorías', async () => {
      await open('/', false);
      http.expectOne('/api/categories').flush({}, { status: 500, statusText: 'Error' });
      productsReq().flush({ data: [product(1)], meta: meta(1) });
      await settle();

      expect(qa('app-product-card')).toHaveLength(1);
    });
  });

  describe('estados de UI', () => {
    it('debe mostrar el skeleton mientras carga', async () => {
      await open('/');

      expect(q('[data-testid="skeleton"]')).not.toBeNull();
      expect(qa('app-product-card')).toHaveLength(0);
      productsReq().flush({ data: [], meta: meta(0) });
    });

    it('debe mostrar una tarjeta por producto cuando la carga tiene éxito', async () => {
      await openWithData('/');

      expect(q('[data-testid="skeleton"]')).toBeNull();
      expect(qa('app-product-card')).toHaveLength(2);
      expect(root().textContent).toContain('Producto 1');
    });

    // En una grilla de imágenes iguales el candidato a LCP depende del orden de pintado: se
    // prioriza la primera fila de escritorio (4 columnas; en móvil, las dos primeras filas).
    it('debe priorizar solo las imágenes de las primeras 4 tarjetas cuando hay resultados', async () => {
      await open('/');
      const six = [1, 2, 3, 4, 5, 6].map((id) => product(id));
      productsReq().flush({ data: six, meta: meta(6) });
      await settle();

      const priorities = qa('app-product-card img').map((img) => img.getAttribute('fetchpriority'));
      expect(priorities).toHaveLength(6);
      expect(priorities.slice(0, 4)).toEqual(['high', 'high', 'high', 'high']);
      expect(priorities.slice(4)).not.toContain('high');
    });

    it('debe mostrar «Mostrando X de Y productos» en una región aria-live polite', async () => {
      await openWithData('/', 30);

      const count = q('[data-testid="results-count"]');
      expect(count?.getAttribute('aria-live')).toBe('polite');
      expect(count?.textContent.trim()).toBe('Mostrando 2 de 30 productos');
    });

    it('debe mostrar el estado vacío con «Limpiar filtros» cuando no hay productos', async () => {
      await open('/?q=zzz');
      productsReq().flush({ data: [], meta: meta(0) });
      await settle();

      expect(root().textContent).toContain('No hay productos para este filtro');
      expect(button('Limpiar filtros')).toBeDefined();
    });

    it('debe volver a la URL sin filtros y pedir de nuevo al pulsar «Limpiar filtros»', async () => {
      await open('/?category=ropa&q=zzz&sort=price&page=3');
      productsReq().flush({ data: [], meta: meta(0, 3) });
      await settle();

      button('Limpiar filtros')?.click();
      await settle();

      expect(url().search).toBe('');
      const req = productsReq();
      expect(req.request.params.has('q')).toBe(false);
      expect(req.request.params.get('page')).toBe('1');
      req.flush({ data: [product(1)], meta: meta(1) });
    });

    it('debe mostrar el error con «Reintentar» y volver a pedir cuando es reintentable', async () => {
      await open('/');
      productsReq().flush({}, { status: 500, statusText: 'Server Error' });
      await settle();

      expect(q('app-error-state')).not.toBeNull();
      button('Reintentar')?.click();
      await settle();

      productsReq().flush({ data: [product(1)], meta: meta(1) });
      await settle();
      expect(qa('app-product-card')).toHaveLength(1);
    });

    it('no debe ofrecer «Reintentar» cuando el error es un 400', async () => {
      await open('/');
      productsReq().flush(
        { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } },
        { status: 400, statusText: 'Bad Request' },
      );
      await settle();

      expect(q('app-error-state')).not.toBeNull();
      expect(button('Reintentar')).toBeUndefined();
    });
  });

  describe('filtros en la URL', () => {
    it('debe poner category en la URL, quitar page y pedir al servidor al elegir una categoría', async () => {
      await openWithData('/?page=2', 30, 2);

      const select = control<HTMLSelectElement>('Categoría');
      select.value = 'ropa';
      select.dispatchEvent(new Event('change'));
      await settle();

      expect(url().searchParams.get('category')).toBe('ropa');
      expect(url().searchParams.has('page')).toBe(false);
      const req = productsReq();
      expect(req.request.params.get('category')).toBe('ropa');
      expect(req.request.params.get('page')).toBe('1');
      req.flush({ data: [], meta: meta(0) });
    });

    it('debe poner sort en la URL y volver a page=1 al cambiar el orden', async () => {
      await openWithData('/?page=3', 40, 3);

      const select = control<HTMLSelectElement>('Ordenar por');
      select.value = 'price';
      select.dispatchEvent(new Event('change'));
      await settle();

      expect(url().searchParams.get('sort')).toBe('price');
      expect(url().searchParams.has('page')).toBe(false);
      productsReq().flush({ data: [], meta: meta(0) });
    });

    it('debe poner q en la URL y volver a page=1 tras el debounce de la búsqueda', async () => {
      await openWithData('/?page=2', 30, 2);

      vi.useFakeTimers();
      const input = control<HTMLInputElement>('Buscar productos');
      input.value = 'merino';
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(299);
      expect(url().searchParams.has('q')).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      // Deja correr las tareas del scheduler de Angular antes de volver a timers reales.
      await vi.advanceTimersByTimeAsync(50);
      vi.useRealTimers();
      await settle();

      expect(url().searchParams.get('q')).toBe('merino');
      expect(url().searchParams.has('page')).toBe(false);
      productsReq().flush({ data: [], meta: meta(0) });
    });

    it('debe poner page en la URL al pulsar «Siguiente»', async () => {
      await openWithData('/', 30);

      button('Siguiente')?.click();
      await settle();

      expect(url().searchParams.get('page')).toBe('2');
      expect(productsReq().request.params.get('page')).toBe('2');
    });

    it('debe pasar a la página elegida al pulsar un número', async () => {
      await openWithData('/', 30);

      button('3')?.click();
      await settle();

      expect(url().searchParams.get('page')).toBe('3');
      productsReq().flush({ data: [], meta: meta(30, 3) });
    });
  });

  describe('paginación', () => {
    it('debe mostrar la navegación de páginas a partir de meta.totalPages', async () => {
      await openWithData('/', 30);

      expect(q('nav[aria-label="Paginación"]')).not.toBeNull();
      expect(button('3')).toBeDefined();
      expect(button('4')).toBeUndefined();
    });

    it('debe ocultar la navegación cuando todo cabe en una página', async () => {
      await openWithData('/', 2);

      expect(qa('app-product-card')).toHaveLength(2);
      expect(q('nav[aria-label="Paginación"]')).toBeNull();
    });
  });
});
