import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Shell } from './shell';

describe('Shell · carrito y puntos', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  async function open() {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    http.expectOne('/api/cart').flush({ data: { items: [], totalItems: 3, total: 3000 } });
    http.expectOne('/api/me').flush({ data: { id: 1, name: 'Ana', pointsBalance: 120 } });
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      root,
      q: (id: string) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`),
    };
  }

  it('debe enlazar al carrito y mostrar el total de unidades en una región aria-live', async () => {
    const { root, q } = await open();

    const link = root.querySelector('a[href="/cart"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('aria-label') ?? link?.textContent).toMatch(/carrito/i);
    expect(q('cart-count')?.textContent).toContain('3');
    expect(q('cart-count')?.getAttribute('aria-live')).toBe('polite');
  });

  it('debe mostrar el saldo de puntos en una región aria-live', async () => {
    const { q } = await open();

    expect(q('points-balance')?.textContent).toContain('120');
    expect(q('points-balance')?.getAttribute('aria-live')).toBe('polite');
  });
});
