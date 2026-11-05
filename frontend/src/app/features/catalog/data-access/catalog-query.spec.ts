import { parseCatalogQuery, toQueryParams } from './catalog-query';

describe('parseCatalogQuery', () => {
  it('debe usar los valores por defecto cuando no hay parámetros', () => {
    expect(parseCatalogQuery({})).toEqual({ page: 1, pageSize: 12, sort: 'newest' });
  });

  it('debe conservar los parámetros válidos', () => {
    const query = parseCatalogQuery({ category: 'ropa', q: 'merino', sort: 'price', page: '2' });

    expect(query).toEqual({ page: 2, pageSize: 12, category: 'ropa', q: 'merino', sort: 'price' });
  });

  it.each(['abc', '0', '-3', '1.5', '1000001', '', '1e3', ' '])(
    'debe volver a la página 1 cuando page es "%s"',
    (page) => {
      expect(parseCatalogQuery({ page }).page).toBe(1);
    },
  );

  it('debe aceptar la página máxima permitida por el servidor', () => {
    expect(parseCatalogQuery({ page: '1000000' }).page).toBe(1000000);
  });

  it('debe usar newest cuando sort no es uno de los permitidos', () => {
    expect(parseCatalogQuery({ sort: 'drop table' }).sort).toBe('newest');
  });

  it.each(['Ropa', 'a b', 'ropa&x=1', '../x', '', 'a'.repeat(51)])(
    'debe descartar la categoría cuando "%s" no es un slug válido',
    (category) => {
      expect(parseCatalogQuery({ category }).category).toBeUndefined();
    },
  );

  it('debe recortar los espacios de q y descartarla cuando queda vacía', () => {
    expect(parseCatalogQuery({ q: '  merino  ' }).q).toBe('merino');
    expect(parseCatalogQuery({ q: '   ' }).q).toBeUndefined();
  });

  it('debe limitar q a 80 caracteres', () => {
    expect(parseCatalogQuery({ q: 'x'.repeat(200) }).q).toHaveLength(80);
  });
});

describe('toQueryParams', () => {
  it('debe omitir los valores por defecto', () => {
    const params = toQueryParams({ page: 1, pageSize: 12, sort: 'newest' });

    expect(params).toEqual({ category: null, q: null, sort: null, page: null });
  });

  it('debe incluir solo lo que se aparta del default', () => {
    const params = toQueryParams({
      page: 3,
      pageSize: 12,
      category: 'ropa',
      q: 'merino',
      sort: 'price',
    });

    expect(params).toEqual({ category: 'ropa', q: 'merino', sort: 'price', page: '3' });
  });
});
