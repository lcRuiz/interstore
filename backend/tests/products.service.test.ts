import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/errors/app-error.js';
import type { ProductRecord, ProductsRepository } from '../src/modules/products/products.repository.js';
import type { ListProductsQuery } from '../src/modules/products/products.schemas.js';
import { createProductsService } from '../src/modules/products/products.service.js';

const record = (overrides: Partial<ProductRecord> = {}): ProductRecord => ({
  id: 1,
  name: 'Camiseta',
  price: 50_000,
  imageUrl: 'https://picsum.photos/seed/a/480/480',
  stock: 4,
  pointsMultiplier: 2,
  categorySlug: 'ropa',
  categoryName: 'Ropa',
  ...overrides,
});

const query = (overrides: Partial<ListProductsQuery> = {}): ListProductsQuery => ({
  page: 1,
  pageSize: 12,
  sort: 'newest',
  ...overrides,
});

function serviceWith(stub: Partial<ProductsRepository>) {
  return createProductsService({
    list: vi.fn(() => ({ rows: [], total: 0 })),
    findById: vi.fn(() => undefined),
    listCategories: vi.fn(() => []),
    ...stub,
  });
}

describe('ProductsService.list', () => {
  it('debe mapear el registro al DTO con category anidada cuando lista', () => {
    const service = serviceWith({ list: () => ({ rows: [record()], total: 1 }) });
    expect(service.list(query()).data).toEqual([
      {
        id: 1,
        name: 'Camiseta',
        price: 50_000,
        imageUrl: 'https://picsum.photos/seed/a/480/480',
        stock: 4,
        pointsMultiplier: 2,
        category: { slug: 'ropa', name: 'Ropa' },
      },
    ]);
  });

  it.each([
    [0, 12, 0],
    [1, 12, 1],
    [12, 12, 1],
    [13, 12, 2],
    [24, 12, 2],
    [25, 12, 3],
    [100, 50, 2],
  ])('debe calcular totalPages cuando total=%i y pageSize=%i', (total, pageSize, totalPages) => {
    const service = serviceWith({ list: () => ({ rows: [], total }) });
    expect(service.list(query({ pageSize })).meta).toEqual({ page: 1, pageSize, total, totalPages });
  });

  it('debe devolver la página pedida en meta aunque esté fuera de rango', () => {
    const service = serviceWith({ list: () => ({ rows: [], total: 5 }) });
    expect(service.list(query({ page: 40, pageSize: 10 }))).toEqual({
      data: [],
      meta: { page: 40, pageSize: 10, total: 5, totalPages: 1 },
    });
  });

  it('debe delegar la consulta tal cual al repositorio cuando lista', () => {
    const list = vi.fn(() => ({ rows: [], total: 0 }));
    const q = query({ category: 'ropa', q: 'abc', sort: 'price', page: 2 });
    serviceWith({ list }).list(q);
    expect(list).toHaveBeenCalledWith(q);
  });
});

describe('ProductsService.getById', () => {
  it('debe devolver el DTO cuando el producto existe', () => {
    const service = serviceWith({ findById: () => record({ id: 7 }) });
    expect(service.getById(7)).toMatchObject({ id: 7, category: { slug: 'ropa', name: 'Ropa' } });
  });

  it('debe lanzar AppError 404 PRODUCT_NOT_FOUND cuando no existe', () => {
    const service = serviceWith({ findById: () => undefined });
    try {
      service.getById(5);
      expect.unreachable('debía lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ status: 404, code: 'PRODUCT_NOT_FOUND' });
    }
  });
});

describe('ProductsService.listCategories', () => {
  it('debe devolver { slug, name } cuando hay categorías', () => {
    const service = serviceWith({ listCategories: () => [{ slug: 'ropa', name: 'Ropa' }] });
    expect(service.listCategories()).toEqual([{ slug: 'ropa', name: 'Ropa' }]);
  });
});
