/**
 * Normaliza texto para búsquedas: minúsculas y sin marcas diacríticas
 * (`Árbol` → `arbol`, `Ñandú` → `nandu`).
 *
 * Es la única definición de "texto buscable": el seed y cualquier escritura de
 * productos la usan para calcular `products.search_name`, y el repositorio la
 * aplica al término `q`. Así ambos lados de la comparación `LIKE` coinciden.
 * `LOWER()` de SQLite solo cubre ASCII, por eso no se usa en el SQL.
 *
 * Conserva `%`, `_` y `\`: el escape para `LIKE` es responsabilidad del repositorio.
 */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
