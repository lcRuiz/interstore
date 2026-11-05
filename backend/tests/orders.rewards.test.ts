import { describe, expect, it } from 'vitest';
import { PURCHASE_POINTS_UNIT, purchasePoints } from '../src/modules/rewards/rewards.js';

describe('purchasePoints [8]', () => {
  it('debe fijar la unidad en $10.000', () => {
    expect(PURCHASE_POINTS_UNIT).toBe(10_000);
  });

  it('debe dar 1 punto por cada $10.000 con multiplicador x1', () => {
    expect(purchasePoints([{ unitPrice: 590_000, quantity: 1, pointsMultiplier: 1 }])).toBe(59);
  });

  it('debe duplicar con multiplicador x2 (Andes Runner = 498)', () => {
    expect(purchasePoints([{ unitPrice: 2_490_000, quantity: 1, pointsMultiplier: 2 }])).toBe(498);
  });

  it('debe multiplicar por la cantidad de la línea', () => {
    expect(purchasePoints([{ unitPrice: 590_000, quantity: 3, pointsMultiplier: 1 }])).toBe(177);
  });

  it('debe redondear hacia abajo por línea y no sobre el total', () => {
    const lines = [
      { unitPrice: 9_999, quantity: 1, pointsMultiplier: 1 }, // 0
      { unitPrice: 15_000, quantity: 1, pointsMultiplier: 1 }, // 1
      { unitPrice: 19_999, quantity: 1, pointsMultiplier: 2 }, // 3
    ];
    expect(purchasePoints(lines)).toBe(4);
    expect(
      purchasePoints([
        { unitPrice: 6_000, quantity: 1, pointsMultiplier: 1 },
        { unitPrice: 6_000, quantity: 1, pointsMultiplier: 1 },
      ]),
    ).toBe(0); // 12.000 en total darían 1; por línea es 0 + 0
  });

  it('debe sumar varias líneas', () => {
    expect(
      purchasePoints([
        { unitPrice: 590_000, quantity: 1, pointsMultiplier: 1 },
        { unitPrice: 2_490_000, quantity: 1, pointsMultiplier: 2 },
      ]),
    ).toBe(557);
  });

  it('debe devolver 0 sin líneas', () => {
    expect(purchasePoints([])).toBe(0);
  });
});
