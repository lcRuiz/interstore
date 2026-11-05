import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Category, ProductSort } from '../../data-access/catalog.types';
import { CatalogFilters } from './catalog-filters';

const categories: Category[] = [
  { slug: 'accesorios', name: 'Accesorios' },
  { slug: 'ropa', name: 'Ropa' },
];

const root = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const byLabel = <T extends HTMLElement>(f: ComponentFixture<unknown>, label: string): T => {
  const l = Array.from(root(f).querySelectorAll('label')).find(
    (x) => x.textContent.trim() === label,
  );
  const el = l?.htmlFor ? root(f).querySelector<T>('#' + l.htmlFor) : null;
  if (!el) throw new Error('Sin control para la etiqueta ' + label);
  return el;
};

async function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(CatalogFilters);
  fixture.componentRef.setInput('categories', categories);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  await fixture.whenStable();
  const out = {
    category: [] as (string | undefined)[],
    search: [] as string[],
    sort: [] as ProductSort[],
  };
  const c = fixture.componentInstance;
  c.categoryChange.subscribe((v) => out.category.push(v));
  c.searchChange.subscribe((v) => out.search.push(v));
  c.sortChange.subscribe((v) => out.sort.push(v));
  return { fixture, out };
}

function type(f: ComponentFixture<unknown>, value: string) {
  const input = byLabel<HTMLInputElement>(f, 'Buscar productos');
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('CatalogFilters', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CatalogFilters] }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe asociar una etiqueta a la búsqueda, la categoría y el orden', async () => {
    const { fixture } = await setup();

    expect(byLabel(fixture, 'Buscar productos').tagName).toBe('INPUT');
    expect(byLabel(fixture, 'Categoría').tagName).toBe('SELECT');
    expect(byLabel(fixture, 'Ordenar por').tagName).toBe('SELECT');
  });

  it('debe ofrecer «Todas» y las categorías con la vigente seleccionada', async () => {
    const { fixture } = await setup({ category: 'ropa' });

    const select = byLabel<HTMLSelectElement>(fixture, 'Categoría');
    expect(Array.from(select.options).map((o) => o.textContent.trim())).toEqual([
      'Todas',
      'Accesorios',
      'Ropa',
    ]);
    expect(select.value).toBe('ropa');
  });

  it('debe seleccionar «Todas» cuando no hay categoría', async () => {
    const { fixture } = await setup();

    expect(byLabel<HTMLSelectElement>(fixture, 'Categoría').value).toBe('');
  });

  it('debe emitir categoryChange con el slug, y undefined para «Todas»', async () => {
    const { fixture, out } = await setup({ category: 'ropa' });
    const select = byLabel<HTMLSelectElement>(fixture, 'Categoría');

    select.value = 'accesorios';
    select.dispatchEvent(new Event('change'));
    select.value = '';
    select.dispatchEvent(new Event('change'));

    expect(out.category).toEqual(['accesorios', undefined]);
  });

  it('debe ofrecer los tres órdenes con el vigente seleccionado', async () => {
    const { fixture } = await setup({ sort: 'price' });

    const select = byLabel<HTMLSelectElement>(fixture, 'Ordenar por');
    expect(Array.from(select.options).map((o) => [o.value, o.textContent.trim()])).toEqual([
      ['name', 'Nombre'],
      ['price', 'Precio'],
      ['newest', 'Más recientes'],
    ]);
    expect(select.value).toBe('price');
  });

  it('debe emitir sortChange al elegir un orden', async () => {
    const { fixture, out } = await setup();
    const select = byLabel<HTMLSelectElement>(fixture, 'Ordenar por');

    select.value = 'name';
    select.dispatchEvent(new Event('change'));

    expect(out.sort).toEqual(['name']);
  });

  it('debe mostrar el texto de búsqueda vigente', async () => {
    const { fixture } = await setup({ q: 'merino' });

    expect(byLabel<HTMLInputElement>(fixture, 'Buscar productos').value).toBe('merino');
  });

  it('debe emitir searchChange solo 300 ms después de dejar de escribir', async () => {
    const { fixture, out } = await setup();

    vi.useFakeTimers();
    type(fixture, 'mer');
    await vi.advanceTimersByTimeAsync(299);
    expect(out.search).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);

    expect(out.search).toEqual(['mer']);
  });

  it('debe emitir una sola vez cuando se escribe varias veces dentro de la ventana', async () => {
    const { fixture, out } = await setup();

    vi.useFakeTimers();
    type(fixture, 'm');
    await vi.advanceTimersByTimeAsync(200);
    type(fixture, 'me');
    await vi.advanceTimersByTimeAsync(200);
    type(fixture, 'mer');
    await vi.advanceTimersByTimeAsync(300);

    expect(out.search).toEqual(['mer']);
  });

  it('no debe volver a emitir cuando el texto final es igual al anterior', async () => {
    const { fixture, out } = await setup();

    vi.useFakeTimers();
    type(fixture, 'mer');
    await vi.advanceTimersByTimeAsync(300);
    type(fixture, 'mera');
    await vi.advanceTimersByTimeAsync(100);
    type(fixture, 'mer');
    await vi.advanceTimersByTimeAsync(300);

    expect(out.search).toEqual(['mer']);
  });

  it('no debe emitir cuando el texto equivale al ya vigente en la URL', async () => {
    const { fixture, out } = await setup({ q: 'mer' });

    vi.useFakeTimers();
    type(fixture, 'mer ');
    await vi.advanceTimersByTimeAsync(300);

    expect(out.search).toEqual([]);
  });

  it('debe emitir el texto recortado', async () => {
    const { fixture, out } = await setup();

    vi.useFakeTimers();
    type(fixture, '  merino ');
    await vi.advanceTimersByTimeAsync(300);

    expect(out.search).toEqual(['merino']);
  });

  it('debe actualizar el campo cuando cambia q desde fuera, como al usar Atrás', async () => {
    const { fixture } = await setup({ q: 'merino' });

    fixture.componentRef.setInput('q', '');
    await fixture.whenStable();

    expect(byLabel<HTMLInputElement>(fixture, 'Buscar productos').value).toBe('');
  });

  it('no debe pisar lo que el usuario sigue escribiendo cuando llega el eco de la URL', async () => {
    const { fixture } = await setup();

    vi.useFakeTimers();
    type(fixture, 'me');
    await vi.advanceTimersByTimeAsync(300);
    type(fixture, 'mer');
    // Deja correr las tareas del scheduler de Angular (< 300 ms) antes de volver a timers reales.
    await vi.advanceTimersByTimeAsync(50);
    vi.useRealTimers();
    fixture.componentRef.setInput('q', 'me');
    await fixture.whenStable();

    expect(byLabel<HTMLInputElement>(fixture, 'Buscar productos').value).toBe('mer');
  });
});
