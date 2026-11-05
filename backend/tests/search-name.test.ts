import { describe, expect, it } from 'vitest';
import { normalizeSearch } from '../src/db/search-name.js';

describe('normalizeSearch', () => {
  it('debe pasar a minúsculas cuando el texto tiene mayúsculas', () => {
    expect(normalizeSearch('Sudadera MERINO')).toBe('sudadera merino');
  });

  it('debe quitar tildes, diéresis y la eñe cuando el texto las contiene', () => {
    expect(normalizeSearch('Calcetín Ñandú Árbol Pingüino')).toBe('calcetin nandu arbol pinguino');
  });

  it('debe conservar %, _, \\ y dígitos cuando el texto los contiene', () => {
    expect(normalizeSearch('50% OFF_x\\y 22 L')).toBe('50% off_x\\y 22 l');
  });

  it('debe devolver cadena vacía cuando el texto es vacío', () => {
    expect(normalizeSearch('')).toBe('');
  });

  it('debe ser idempotente cuando se aplica dos veces', () => {
    const once = normalizeSearch('ÁÉÍÓÚ Ü');
    expect(normalizeSearch(once)).toBe(once);
    expect(once).toBe('aeiou u');
  });
});
