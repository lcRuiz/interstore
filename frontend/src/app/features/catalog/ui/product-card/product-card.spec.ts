import { provideRouter } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import {
  ChangeDetectionStrategy,
  Component,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { Product } from '../../data-access/catalog.types';
import { ProductCard } from './product-card';

registerLocaleData(localeEsCO);

const base: Product = {
  id: 7,
  name: 'Chaqueta de lana merino',
  price: 2490000,
  imageUrl: 'https://picsum.photos/seed/store-7/480/480',
  stock: 4,
  pointsMultiplier: 1,
  category: { slug: 'ropa', name: 'Ropa' },
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProductCard],
  template: `<app-product-card [product]="product"
    ><button card-actions type="button" data-testid="extra">Extra</button></app-product-card
  >`,
})
class Host {
  product = base;
}

const q = (f: ComponentFixture<unknown>, sel: string) =>
  (f.nativeElement as HTMLElement).querySelector<HTMLElement>(sel);
const text = (f: ComponentFixture<unknown>, sel: string) => q(f, sel)?.textContent.trim() ?? '';

async function render(over: Partial<Product> = {}, priority?: boolean) {
  const fixture = TestBed.createComponent(ProductCard);
  fixture.componentRef.setInput('product', { ...base, ...over });
  if (priority !== undefined) fixture.componentRef.setInput('priority', priority);
  await fixture.whenStable();
  return fixture;
}

describe('ProductCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCard, Host],
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-CO' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'COP' },
      ],
    }).compileComponents();
  });

  it('debe mostrar nombre y categoría del producto', async () => {
    const fixture = await render();

    expect(text(fixture, '[data-testid="name"]')).toBe('Chaqueta de lana merino');
    expect(text(fixture, '[data-testid="category"]')).toBe('Ropa');
  });

  it('debe formatear el precio en pesos colombianos sin decimales', async () => {
    const fixture = await render();

    expect(text(fixture, '[data-testid="price"]').replace(/\s/g, ' ')).toBe('$ 2.490.000');
  });

  // La caja de la imagen es 4:5 (diseño) y las fotos son cuadradas: con width/height 480x480
  // NgOptimizedImage avisa de distorsión (NG02952). El modo `fill` llena el contenedor, que ya
  // reserva el espacio con aspect-ratio (sin saltos de layout).
  it('debe renderizar la imagen en modo fill, con alt y sin dimensiones cuadradas fijas', async () => {
    const fixture = await render();

    const img = q(fixture, 'img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(base.imageUrl);
    expect(img.getAttribute('alt')).toBe(base.name);
    expect(img.hasAttribute('width')).toBe(false);
    expect(img.hasAttribute('height')).toBe(false);
    expect(img.style.position).toBe('absolute');
  });

  it('debe cargar la imagen en diferido y sin prioridad cuando priority no está activo', async () => {
    const fixture = await render();

    const img = q(fixture, 'img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('fetchpriority')).not.toBe('high');
  });

  it('debe priorizar la imagen cuando priority está activo (candidata a LCP)', async () => {
    const fixture = await render({}, true);

    const img = q(fixture, 'img') as HTMLImageElement;
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.getAttribute('loading')).not.toBe('lazy');
  });

  it('debe omitir la imagen cuando la URL no es https', async () => {
    const fixture = await render({ imageUrl: 'javascript:alert(1)' });

    expect(text(fixture, '[data-testid="name"]')).toBe(base.name);
    expect(q(fixture, 'img')).toBeNull();
  });

  it('debe mostrar la insignia «Puntos x2» solo cuando el multiplicador es 2', async () => {
    const doble = await render({ pointsMultiplier: 2 });
    expect(text(doble, '[data-testid="points-badge"]')).toBe('Puntos x2');

    const normal = await render({ pointsMultiplier: 1 });
    expect(q(normal, '[data-testid="points-badge"]')).toBeNull();
  });

  it('debe mostrar «Agotado» solo cuando el stock es 0', async () => {
    const agotado = await render({ stock: 0 });
    expect(text(agotado, '[data-testid="sold-out"]')).toBe('Agotado');

    const disponible = await render({ stock: 1 });
    expect(q(disponible, '[data-testid="sold-out"]')).toBeNull();
  });

  it('debe proyectar el contenido marcado como card-actions', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    expect(text(fixture, '[data-testid="extra"]')).toBe('Extra');
    expect(q(fixture, 'app-product-card [data-testid="extra"]')).not.toBeNull();
  });
});
