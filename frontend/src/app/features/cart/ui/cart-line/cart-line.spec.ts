import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CartItem } from '../../data-access/cart.types';
import { CartLine } from './cart-line';

registerLocaleData(localeEsCO);

const item = (quantity: number, stock = 10): CartItem => ({
  productId: 7,
  quantity,
  lineTotal: 1500 * quantity,
  product: {
    id: 7,
    name: 'Camiseta',
    price: 1500,
    imageUrl: 'https://picsum.photos/seed/a/480/480',
    stock,
    pointsMultiplier: 1,
    category: { slug: 'ropa', name: 'Ropa' },
  },
});

describe('CartLine', () => {
  function setup(value: CartItem) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-CO' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'COP' },
      ],
    });
    const fixture = TestBed.createComponent(CartLine);
    fixture.componentRef.setInput('item', value);
    const root = fixture.nativeElement as HTMLElement;
    const el = <T extends HTMLElement>(id: string) =>
      root.querySelector<T>(`[data-testid="${id}"]`);
    return { fixture, root, el };
  }

  it('debe mostrar nombre, cantidad y total de la línea', async () => {
    const { fixture, root, el } = setup(item(2));
    await fixture.whenStable();

    expect(root.textContent).toContain('Camiseta');
    expect(el('qty')?.textContent).toContain('2');
    expect(el('line-total')?.textContent).toContain('3.000');
  });

  it('debe emitir quantityChange con cantidad +1 al pulsar «+»', async () => {
    const { fixture, el } = setup(item(2));
    const spy = vi.fn();
    fixture.componentInstance.quantityChange.subscribe(spy);
    await fixture.whenStable();

    el('inc')?.click();

    expect(spy).toHaveBeenCalledWith(3);
  });

  it('debe emitir quantityChange con cantidad -1 al pulsar «−»', async () => {
    const { fixture, el } = setup(item(2));
    const spy = vi.fn();
    fixture.componentInstance.quantityChange.subscribe(spy);
    await fixture.whenStable();

    el('dec')?.click();

    expect(spy).toHaveBeenCalledWith(1);
  });

  it('debe deshabilitar «−» cuando la cantidad es 1', async () => {
    const { fixture, el } = setup(item(1));
    await fixture.whenStable();

    expect(el<HTMLButtonElement>('dec')?.disabled).toBe(true);
  });

  it('debe deshabilitar «+» al llegar al stock', async () => {
    const { fixture, el } = setup(item(3, 3));
    await fixture.whenStable();

    expect(el<HTMLButtonElement>('inc')?.disabled).toBe(true);
  });

  it('debe deshabilitar «+» al llegar a 99 unidades aunque haya más stock', async () => {
    const { fixture, el } = setup(item(99, 500));
    await fixture.whenStable();

    expect(el<HTMLButtonElement>('inc')?.disabled).toBe(true);
  });

  it('debe emitir remove al pulsar Quitar', async () => {
    const { fixture, el } = setup(item(2));
    const spy = vi.fn();
    fixture.componentInstance.remove.subscribe(spy);
    await fixture.whenStable();

    el('remove')?.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
