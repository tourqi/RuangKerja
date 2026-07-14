import { describe, expect, it } from 'vitest';
import {
  isDateInRange,
  sumAmounts,
  groupSumByKey,
  sortCashFlowEntries,
  withRunningBalance,
} from './reportCalculations';

describe('isDateInRange', () => {
  it('includes boundary dates (inclusive from/to)', () => {
    expect(isDateInRange('2026-07-01', '2026-07-01', '2026-07-31')).toBe(true);
    expect(isDateInRange('2026-07-31', '2026-07-01', '2026-07-31')).toBe(true);
  });

  it('excludes dates outside the range', () => {
    expect(isDateInRange('2026-06-30', '2026-07-01', '2026-07-31')).toBe(false);
    expect(isDateInRange('2026-08-01', '2026-07-01', '2026-07-31')).toBe(false);
  });

  it('handles full ISO timestamps by comparing only the date part', () => {
    expect(isDateInRange('2026-07-15T23:59:59Z', '2026-07-01', '2026-07-31')).toBe(true);
  });
});

describe('sumAmounts', () => {
  it('sums amounts', () => {
    expect(sumAmounts([{ amount: 100 }, { amount: 250 }])).toBe(350);
  });

  it('returns 0 for empty input', () => {
    expect(sumAmounts([])).toBe(0);
  });
});

describe('groupSumByKey', () => {
  it('groups and sums amounts by key', () => {
    const items = [
      { method: 'transfer', amount: 100 },
      { method: 'cash', amount: 50 },
      { method: 'transfer', amount: 25 },
    ];
    expect(groupSumByKey(items, (i) => i.method, (i) => i.amount)).toEqual({
      transfer: 125,
      cash: 50,
    });
  });

  it('returns an empty object for empty input', () => {
    expect(groupSumByKey([], () => '', () => 0)).toEqual({});
  });
});

describe('sortCashFlowEntries', () => {
  it('sorts by date ascending', () => {
    const entries = [
      { date: '2026-07-03', isInflow: true, amount: 1 },
      { date: '2026-07-01', isInflow: true, amount: 2 },
      { date: '2026-07-02', isInflow: true, amount: 3 },
    ];
    expect(sortCashFlowEntries(entries).map((e) => e.date)).toEqual([
      '2026-07-01', '2026-07-02', '2026-07-03',
    ]);
  });

  it('places inflow before outflow on the same date', () => {
    const entries = [
      { date: '2026-07-01', isInflow: false, amount: 1 },
      { date: '2026-07-01', isInflow: true, amount: 2 },
    ];
    expect(sortCashFlowEntries(entries).map((e) => e.isInflow)).toEqual([true, false]);
  });

  it('does not mutate the input array', () => {
    const entries = [
      { date: '2026-07-02', isInflow: true, amount: 1 },
      { date: '2026-07-01', isInflow: true, amount: 2 },
    ];
    const original = [...entries];
    sortCashFlowEntries(entries);
    expect(entries).toEqual(original);
  });
});

describe('withRunningBalance', () => {
  it('accumulates inflows and subtracts outflows in order', () => {
    const entries = [
      { date: '2026-07-01', isInflow: true, amount: 1000 },
      { date: '2026-07-02', isInflow: false, amount: 300 },
      { date: '2026-07-03', isInflow: true, amount: 500 },
    ];
    expect(withRunningBalance(entries).map((e) => e.balance)).toEqual([1000, 700, 1200]);
  });

  it('allows the balance to go negative', () => {
    const entries = [{ date: '2026-07-01', isInflow: false, amount: 500 }];
    expect(withRunningBalance(entries)[0].balance).toBe(-500);
  });

  it('returns an empty array for empty input', () => {
    expect(withRunningBalance([])).toEqual([]);
  });
});
