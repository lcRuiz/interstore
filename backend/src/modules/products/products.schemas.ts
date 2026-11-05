import { z } from 'zod';

export const SORT_VALUES = ['name', 'price', 'newest'] as const;
export type ProductSort = (typeof SORT_VALUES)[number];

export const MAX_PAGE = 1_000_000;
export const MAX_PAGE_SIZE = 50;
export const MAX_QUERY_LENGTH = 80;

/** Query de `GET /api/products`. Los parámetros desconocidos se ignoran. */
export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(12),
  category: z.string().regex(/^[a-z0-9-]{1,50}$/, 'slug inválido').optional(),
  q: z.string().trim().max(MAX_QUERY_LENGTH).optional(),
  sort: z.enum(SORT_VALUES).default('newest'),
});
export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;

/** Param `:id` de `GET /api/products/:id`: entero positivo en notación decimal. */
export const productIdParamsSchema = z.object({
  id: z
    .string()
    .regex(/^[1-9]\d{0,9}$/, 'debe ser un entero positivo')
    .transform(Number),
});
