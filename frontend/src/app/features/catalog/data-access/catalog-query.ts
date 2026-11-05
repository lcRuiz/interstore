import { DEFAULT_SORT, PAGE_SIZE, PRODUCT_SORTS, type ProductQuery } from './catalog.types';

const SLUG_PATTERN = /^[a-z0-9-]{1,50}$/;
const MAX_PAGE = 1_000_000;
const MAX_SEARCH_LENGTH = 80;

/** Valores crudos de la URL (query params o inputs enlazados por el router). */
export interface RawCatalogQuery {
  category?: string | undefined;
  q?: string | undefined;
  sort?: string | undefined;
  page?: string | undefined;
}

/** Query params de la URL del catálogo; `null` elimina el parámetro. */
export interface CatalogQueryParams {
  category: string | null;
  q: string | null;
  sort: string | null;
  page: string | null;
}

/**
 * Valida y normaliza los parámetros crudos de la URL antes de que viajen a la API.
 *
 * Todo valor inválido cae a su default: `page` no entero o fuera de 1..1000000 pasa a 1,
 * `sort` desconocido pasa a `newest`, `category` que no sea un slug válido queda sin filtro,
 * `q` se recorta y se limita a 80 caracteres (vacío = sin filtro).
 *
 * @param raw Parámetros tal como llegan de la URL.
 * @returns Consulta segura para `CatalogApi.listProducts`.
 */
export function parseCatalogQuery(raw: RawCatalogQuery): ProductQuery {
  const query: ProductQuery = {
    page: parsePage(raw.page),
    pageSize: PAGE_SIZE,
    sort: PRODUCT_SORTS.find((sort) => sort === raw.sort) ?? DEFAULT_SORT,
  };
  if (raw.category !== undefined && SLUG_PATTERN.test(raw.category)) query.category = raw.category;
  const text = raw.q?.trim().slice(0, MAX_SEARCH_LENGTH).trim();
  if (text) query.q = text;
  return query;
}

/**
 * Convierte una consulta en query params de URL omitiendo los valores por defecto.
 *
 * @param query Consulta actual.
 * @returns Parámetros listos para `Router.navigate`; `null` donde el valor es el default.
 */
export function toQueryParams(query: ProductQuery): CatalogQueryParams {
  return {
    category: query.category ?? null,
    q: query.q ?? null,
    sort: query.sort === DEFAULT_SORT ? null : query.sort,
    page: query.page > 1 ? String(query.page) : null,
  };
}

function parsePage(raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}
