import type { StatementSync } from 'node:sqlite';
import type { Db } from '../../db/connection.js';
import { normalizeSearch } from '../../db/search-name.js';
import type { ListProductsQuery, ProductSort } from './products.schemas.js';

/**
 * Fila de producto con su categoría aplanada. Es el único shape que sale del
 * repositorio: nunca incluye `search_name`, `category_id` ni `created_at`.
 */
export interface ProductRecord {
  id: number;
  name: string;
  /** COP, entero. */
  price: number;
  imageUrl: string;
  stock: number;
  pointsMultiplier: number;
  categorySlug: string;
  categoryName: string;
}

export interface CategoryRecord {
  slug: string;
  name: string;
}

/** Una página de resultados y el total de filas que cumplen el filtro (sin paginar). */
export interface ProductsPage {
  rows: ProductRecord[];
  total: number;
}

export type ProductsRepository = ReturnType<typeof createProductsRepository>;

const SELECT_PRODUCT = `
  SELECT p.id, p.name, p.price, p.image_url AS imageUrl, p.stock,
         p.points_multiplier AS pointsMultiplier,
         c.slug AS categorySlug, c.name AS categoryName
  FROM products p
  JOIN categories c ON c.id = p.category_id`;

/**
 * `ORDER BY` por lista blanca: el valor de `sort` NUNCA se interpola; se elige
 * una de estas cadenas constantes (los identificadores no se pueden parametrizar).
 * Todas desempatan por `id` para que la paginación sea estable.
 * `name` ordena por `search_name` (sin tildes ni mayúsculas): el orden binario
 * de SQLite pondría "Árbol" después de "Zapato".
 */
const ORDER_BY: Record<ProductSort, string> = {
  name: 'p.search_name ASC, p.id ASC',
  price: 'p.price ASC, p.id ASC',
  newest: 'p.created_at DESC, p.id DESC',
};

/** Escapa `\`, `%` y `_` para que `LIKE ... ESCAPE '\'` los trate como texto literal. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Acceso a datos del catálogo. SQL parametrizado: los valores del cliente
 * (categoría, búsqueda, límites) viajan siempre como parámetros enlazados; solo
 * se concatenan fragmentos constantes definidos en este archivo.
 */
export function createProductsRepository(db: Db) {
  // Las variantes de SQL son finitas (filtros presentes/ausentes x 3 órdenes): se cachean.
  const statements = new Map<string, StatementSync>();
  const prepare = (sql: string): StatementSync => {
    let statement = statements.get(sql);
    if (!statement) {
      statement = db.prepare(sql);
      statements.set(sql, statement);
    }
    return statement;
  };

  return {
    /**
     * Lista productos con filtros, orden y paginación resueltos en SQL.
     *
     * - `category`: slug exacto; un slug inexistente devuelve `{ rows: [], total: 0 }`.
     * - `q`: subcadena sin distinguir mayúsculas ni tildes (contra `search_name`);
     *   `%`, `_` y `\` se buscan como texto literal.
     * - `total` usa el mismo `WHERE` que la página (dos lecturas consecutivas; el
     *   catálogo es de solo lectura en esta feature, así que no hace falta una transacción).
     * - Una página fuera de rango devuelve `rows: []` con el `total` real.
     */
    list(query: ListProductsQuery): ProductsPage {
      const where: string[] = [];
      const params: Array<string | number> = [];

      if (query.category !== undefined) {
        where.push('c.slug = ?');
        params.push(query.category);
      }
      const needle = query.q ? normalizeSearch(query.q) : '';
      if (needle !== '') {
        where.push("p.search_name LIKE ? ESCAPE '\\'");
        params.push(`%${escapeLike(needle)}%`);
      }
      const whereSql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';

      const { total } = prepare(
        `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id${whereSql}`,
      ).get(...params) as { total: number };

      const offset = (query.page - 1) * query.pageSize;
      const rows = prepare(`${SELECT_PRODUCT}${whereSql} ORDER BY ${ORDER_BY[query.sort]} LIMIT ? OFFSET ?`).all(
        ...params,
        query.pageSize,
        offset,
      ) as unknown as ProductRecord[];

      return { rows, total };
    },

    /** Producto por id, o `undefined` si no existe. */
    findById(id: number): ProductRecord | undefined {
      return prepare(`${SELECT_PRODUCT} WHERE p.id = ?`).get(id) as unknown as ProductRecord | undefined;
    },

    /** Todas las categorías, ordenadas por nombre (y por id para desempatar). */
    listCategories(): CategoryRecord[] {
      return prepare('SELECT slug, name FROM categories ORDER BY name, id').all() as unknown as CategoryRecord[];
    },
  };
}
