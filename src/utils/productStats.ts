import type { LeadProductUsage, Product } from "@/types/db";

export interface ProductStat {
  diminati: number;
  dibeli: number;
}

/**
 * Diminati = jumlah lead yang memilih produk ini. Dibeli = yang ditandai dibeli
 * pada lead berstatus Deal Won, supaya lead yang mundur dari Won tidak terhitung.
 */
export function computeProductStats(usage: LeadProductUsage[]): Record<string, ProductStat> {
  const stats: Record<string, ProductStat> = {};
  for (const row of usage) {
    const stat = (stats[row.product_id] ??= { diminati: 0, dibeli: 0 });
    stat.diminati += 1;
    if (row.dibeli && row.lead_status === "Deal Won") stat.dibeli += 1;
  }
  return stats;
}

/** Urutan default: paling banyak dibeli, lalu paling diminati, lalu kode produk. */
export function sortProductsByDemand(products: Product[], stats: Record<string, ProductStat>): Product[] {
  return [...products].sort((a, b) => {
    const statA = stats[a.id];
    const statB = stats[b.id];
    return (
      (statB?.dibeli ?? 0) - (statA?.dibeli ?? 0) ||
      (statB?.diminati ?? 0) - (statA?.diminati ?? 0) ||
      a.kode.localeCompare(b.kode)
    );
  });
}
