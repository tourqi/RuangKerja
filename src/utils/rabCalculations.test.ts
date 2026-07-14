import { describe, expect, it } from 'vitest';
import {
  itemTotal,
  groupSubtotal,
  grandTotal,
  netTotal,
  diskonNilaiFromPersen,
  diskonPersenFromNilai,
} from './rabCalculations';

describe('itemTotal', () => {
  it('multiplies qty by harga', () => {
    expect(itemTotal({ qty: 3, harga: 150000 })).toBe(450000);
  });

  it('handles fractional qty (e.g. m2 dimensions)', () => {
    expect(itemTotal({ qty: 2.5, harga: 100000 })).toBe(250000);
  });

  it('returns 0 when qty or harga is 0', () => {
    expect(itemTotal({ qty: 0, harga: 100000 })).toBe(0);
    expect(itemTotal({ qty: 5, harga: 0 })).toBe(0);
  });
});

describe('groupSubtotal', () => {
  it('sums all item totals in a group', () => {
    const group = {
      items: [
        { qty: 2, harga: 100000 },
        { qty: 1, harga: 50000 },
      ],
    };
    expect(groupSubtotal(group)).toBe(250000);
  });

  it('returns 0 for an empty group', () => {
    expect(groupSubtotal({ items: [] })).toBe(0);
  });
});

describe('grandTotal', () => {
  it('sums subtotals across multiple groups', () => {
    const groups = [
      { items: [{ qty: 2, harga: 100000 }] },
      { items: [{ qty: 1, harga: 50000 }, { qty: 3, harga: 20000 }] },
    ];
    expect(grandTotal(groups)).toBe(200000 + 50000 + 60000);
  });

  it('returns 0 for no groups', () => {
    expect(grandTotal([])).toBe(0);
  });
});

describe('netTotal', () => {
  const groups = [{ items: [{ qty: 1, harga: 1000000 }] }];

  it('subtracts diskon_nilai from the grand total', () => {
    expect(netTotal(groups, 100000)).toBe(900000);
  });

  it('treats undefined diskon as no discount', () => {
    expect(netTotal(groups)).toBe(1000000);
  });

  it('does not clamp negative net totals (diskon larger than total)', () => {
    // Matches current behavior in RabEditor/SphPrintView/generateSph: no floor at 0.
    expect(netTotal(groups, 5000000)).toBe(-4000000);
  });
});

describe('diskon persen/nilai round-trip', () => {
  it('converts persen to nilai using the same rounding as RabEditor', () => {
    expect(diskonNilaiFromPersen(1000000, 10)).toBe(100000);
    expect(diskonNilaiFromPersen(1000000, 12.5)).toBe(125000);
  });

  it('converts nilai back to persen', () => {
    expect(diskonPersenFromNilai(1000000, 100000)).toBe(10);
  });

  it('returns 0 when total is 0, avoiding division by zero', () => {
    expect(diskonNilaiFromPersen(0, 10)).toBe(0);
    expect(diskonPersenFromNilai(0, 100000)).toBe(0);
  });
});
