export interface RabCalcItem {
  qty: number;
  harga: number;
}

export interface RabCalcGroup {
  items: RabCalcItem[];
}

export function itemTotal(item: RabCalcItem): number {
  return item.qty * item.harga;
}

export function groupSubtotal(group: RabCalcGroup): number {
  return group.items.reduce((sum, item) => sum + itemTotal(item), 0);
}

export function grandTotal(groups: RabCalcGroup[]): number {
  return groups.reduce((sum, group) => sum + groupSubtotal(group), 0);
}

export function netTotal(groups: RabCalcGroup[], diskonNilai?: number): number {
  return grandTotal(groups) - (diskonNilai ?? 0);
}

export function diskonNilaiFromPersen(total: number, persen: number): number {
  return total > 0 ? Math.round((total * persen) / 100) : 0;
}

export function diskonPersenFromNilai(total: number, nilai: number): number {
  return total > 0 ? (nilai / total) * 100 : 0;
}
