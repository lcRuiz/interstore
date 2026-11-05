import { AppError } from '../../errors/app-error.js';
import type { CategoryRecord, ProductRecord, ProductsRepository } from './products.repository.js';
import type { ListProductsQuery } from './products.schemas.js';

/** Producto tal como lo ve el cliente. Contrato público de la API. */
export interface ProductDto {
  id: number;
  name: string;
  /** COP, entero. */
  price: number;
  imageUrl: string;
  /** 0 = agotado. */
  stock: number;
  /** Multiplicador de puntos de compra (1 o 2). */
  pointsMultiplier: number;
  category: { slug: string; name: string };
}

export interface CategoryDto {
  slug: string;
  name: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  /** `ceil(total / pageSize)`; 0 cuando no hay resultados. */
  totalPages: number;
}

export type ProductsService = ReturnType<typeof createProductsService>;

export function toProductDto(record: ProductRecord): ProductDto {
  return {
    id: record.id,
    name: record.name,
    price: record.price,
    imageUrl: record.imageUrl,
    stock: record.stock,
    pointsMultiplier: record.pointsMultiplier,
    category: { slug: record.categorySlug, name: record.categoryName },
  };
}

/** Casos de uso del catálogo. No conoce HTTP; traduce registros a DTOs y errores de dominio. */
export function createProductsService(repo: ProductsRepository) {
  return {
    /**
     * Página de productos con su metadato de paginación.
     * @param query consulta ya validada (límites, `sort` en lista blanca).
     */
    list(query: ListProductsQuery): { data: ProductDto[]; meta: PageMeta } {
      const { rows, total } = repo.list(query);
      return {
        data: rows.map(toProductDto),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },

    /** @throws {AppError} 404 `PRODUCT_NOT_FOUND` si el id no existe. */
    getById(id: number): ProductDto {
      const record = repo.findById(id);
      if (!record) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Producto no encontrado');
      return toProductDto(record);
    },

    /** Categorías para el filtro del catálogo. */
    listCategories(): CategoryDto[] {
      return repo.listCategories().map((category: CategoryRecord) => ({ slug: category.slug, name: category.name }));
    },
  };
}
