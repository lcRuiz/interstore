import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Pagination } from './pagination';

async function render(page: number, totalPages: number) {
  const fixture = TestBed.createComponent(Pagination);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('totalPages', totalPages);
  await fixture.whenStable();
  const emitted: number[] = [];
  fixture.componentInstance.pageChange.subscribe((p) => emitted.push(p));
  return { fixture, emitted };
}

const root = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const items = (f: ComponentFixture<unknown>) =>
  Array.from(root(f).querySelectorAll('li')).map((li) => li.textContent.trim());
const button = (f: ComponentFixture<unknown>, label: string) =>
  Array.from(root(f).querySelectorAll('button')).find((b) => b.textContent.trim() === label);

describe('Pagination', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Pagination] }).compileComponents();
  });

  it('debe renderizar un nav con aria-label', async () => {
    const { fixture } = await render(1, 5);

    const nav = root(fixture).querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Paginación');
  });

  it('debe listar todas las páginas cuando son pocas', async () => {
    const { fixture } = await render(1, 5);

    expect(items(fixture)).toEqual(['Anterior', '1', '2', '3', '4', '5', 'Siguiente']);
  });

  it('debe marcar solo la página actual con aria-current', async () => {
    const { fixture } = await render(3, 5);

    const current = root(fixture).querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent.trim()).toBe('3');
  });

  it('debe resumir con elipsis cuando hay muchas páginas', async () => {
    const mid = await render(10, 20);
    expect(items(mid.fixture)).toEqual([
      'Anterior',
      '1',
      '…',
      '9',
      '10',
      '11',
      '…',
      '20',
      'Siguiente',
    ]);

    const start = await render(1, 20);
    expect(items(start.fixture)).toEqual(['Anterior', '1', '2', '…', '20', 'Siguiente']);

    const end = await render(20, 20);
    expect(items(end.fixture)).toEqual(['Anterior', '1', '…', '19', '20', 'Siguiente']);
  });

  it('debe deshabilitar «Anterior» en la primera página', async () => {
    const { fixture } = await render(1, 5);

    expect(button(fixture, 'Anterior')?.disabled).toBe(true);
    expect(button(fixture, 'Siguiente')?.disabled).toBe(false);
  });

  it('debe deshabilitar «Siguiente» en la última página', async () => {
    const { fixture } = await render(5, 5);

    expect(button(fixture, 'Siguiente')?.disabled).toBe(true);
    expect(button(fixture, 'Anterior')?.disabled).toBe(false);
  });

  it('debe emitir el número de página al pulsarlo', async () => {
    const { fixture, emitted } = await render(1, 5);

    button(fixture, '4')?.click();

    expect(emitted).toEqual([4]);
  });

  it('debe emitir page-1 y page+1 con los botones anterior y siguiente', async () => {
    const { fixture, emitted } = await render(3, 5);

    button(fixture, 'Anterior')?.click();
    button(fixture, 'Siguiente')?.click();

    expect(emitted).toEqual([2, 4]);
  });

  it('debe etiquetar cada número con «Página N» para lectores de pantalla', async () => {
    const { fixture } = await render(1, 3);

    expect(button(fixture, '2')?.getAttribute('aria-label')).toBe('Página 2');
  });

  it('no debe renderizarse cuando hay una sola página o ninguna', async () => {
    const two = await render(1, 2);
    expect(root(two.fixture).querySelector('nav')).not.toBeNull();

    const one = await render(1, 1);
    expect(root(one.fixture).querySelector('nav')).toBeNull();

    const none = await render(1, 0);
    expect(root(none.fixture).querySelector('nav')).toBeNull();
  });
});
