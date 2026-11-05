import { TestBed } from '@angular/core/testing';
import { ProductGridSkeleton } from './product-grid-skeleton';

describe('ProductGridSkeleton', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductGridSkeleton] }).compileComponents();
  });

  it('debe renderizar 12 tarjetas fantasma por defecto', async () => {
    const fixture = TestBed.createComponent(ProductGridSkeleton);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[data-testid="skeleton-card"]')).toHaveLength(12);
  });

  it('debe renderizar la cantidad pedida', async () => {
    const fixture = TestBed.createComponent(ProductGridSkeleton);
    fixture.componentRef.setInput('count', 4);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[data-testid="skeleton-card"]')).toHaveLength(4);
  });

  it('debe ocultarse a los lectores de pantalla', async () => {
    const fixture = TestBed.createComponent(ProductGridSkeleton);
    await fixture.whenStable();

    const list = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="skeleton"]');
    expect(list?.getAttribute('aria-hidden')).toBe('true');
  });
});
