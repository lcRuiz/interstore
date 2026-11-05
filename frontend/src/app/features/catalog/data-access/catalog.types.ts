/**
 * Tipos del catálogo, espejo de `backend/openapi.yaml`.
 * Los usan `GET /api/products` y `GET /api/categories`.
 */

/** Categoría del catálogo; `slug` es el valor que viaja en `?category=`. */
export interface Category {
  /** Identificador estable en URL (solo minúsculas, dígitos y guiones). */
  slug: string;
  /** Nombre para mostrar. */
  name: string;
}

/** Producto del catálogo. */
export interface Product {
  id: number;
  /** Máximo 120 caracteres. */
  name: string;
  /** Precio en COP, entero. */
  price: number;
  /** URL absoluta de la imagen (480x480 en el seed). */
  imageUrl: string;
  /** Unidades disponibles; 0 = agotado. */
  stock: number;
  /** Multiplicador de puntos de compra: 2 = «Puntos x2». */
  pointsMultiplier: 1 | 2;
  category: Category;
}

/** Criterios de orden aceptados por el servidor. */
export const PRODUCT_SORTS = ['name', 'price', 'newest'] as const;

/** Orden de `GET /api/products?sort=`. */
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Orden por defecto del servidor. */
export const DEFAULT_SORT: ProductSort = 'newest';

/** Tamaño de página del catálogo (default del servidor; divisible entre 2, 3 y 4 columnas). */
export const PAGE_SIZE = 12;

/** Consulta ya validada que viaja a `GET /api/products`. */
export interface ProductQuery {
  /** Página, entero mayor o igual a 1. */
  page: number;
  pageSize: number;
  /** Slug de categoría; `undefined` = todas. */
  category?: string;
  /** Texto de búsqueda (máximo 80 caracteres, recortado); `undefined` = sin filtro. */
  q?: string;
  sort: ProductSort;
}
