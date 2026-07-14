export function isDateInRange(dateStr: string, from: string, to: string): boolean {
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}

export function sumAmounts(items: { amount: number }[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export function groupSumByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
  amountFn: (item: T) => number
): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] ?? 0) + amountFn(item);
    return acc;
  }, {});
}

export interface CashFlowEntry {
  date: string;
  isInflow: boolean;
  amount: number;
}

/** Sorts by date ascending; on a tie, inflows are listed before outflows. */
export function sortCashFlowEntries<T extends CashFlowEntry>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    if (a.isInflow && !b.isInflow) return -1;
    if (!a.isInflow && b.isInflow) return 1;
    return 0;
  });
}

/** Assumes entries are already ordered (see sortCashFlowEntries). */
export function withRunningBalance<T extends CashFlowEntry>(
  entries: T[]
): (T & { balance: number })[] {
  let running = 0;
  return entries.map((entry) => {
    running += entry.isInflow ? entry.amount : -entry.amount;
    return { ...entry, balance: running };
  });
}
