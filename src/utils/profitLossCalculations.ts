export interface ProfitLossMetrics {
  nilai: number;
  tagihan: number;
  terkumpul: number;
  pengeluaran: number;
  laba: number;
  margin: number | null;
}

export interface ProfitLossTotals {
  totalNilai: number;
  totalTerkumpul: number;
  totalPengeluaran: number;
  totalLaba: number;
  totalMargin: number;
}

export interface ProfitLossResult<P> {
  rows: (ProfitLossMetrics & { project: P })[];
  totals: ProfitLossTotals;
}

/**
 * Only includes projects that have recorded expenses or collected payments —
 * matches the "Laba Rugi" tab in ReportsOverview, which hides projects with
 * no financial activity yet rather than showing an all-zero row.
 */
export function computeProjectProfitLoss<P extends { id: string; value?: number }>(
  projects: P[],
  expenses: { project_id: string; jumlah: number }[],
  invoices: { project_id?: string; total_amount: number; paid_amount: number }[],
  getProjectValue: (p: P) => number
): ProfitLossResult<P> {
  const expenseByProject = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.project_id] = (acc[e.project_id] ?? 0) + e.jumlah;
    return acc;
  }, {});

  const paidByProject = invoices.reduce<Record<string, number>>((acc, inv) => {
    if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.paid_amount;
    return acc;
  }, {});

  const billedByProject = invoices.reduce<Record<string, number>>((acc, inv) => {
    if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.total_amount;
    return acc;
  }, {});

  const rows = projects
    .filter((p) => (expenseByProject[p.id] ?? 0) > 0 || (paidByProject[p.id] ?? 0) > 0)
    .map((p) => {
      const nilai = getProjectValue(p);
      const tagihan = billedByProject[p.id] ?? 0;
      const terkumpul = paidByProject[p.id] ?? 0;
      const pengeluaran = expenseByProject[p.id] ?? 0;
      const laba = terkumpul - pengeluaran;
      const margin = terkumpul > 0 ? Math.round((laba / terkumpul) * 100) : null;
      return { project: p, nilai, tagihan, terkumpul, pengeluaran, laba, margin };
    })
    .sort((a, b) => b.laba - a.laba);

  const totalNilai = rows.reduce((s, r) => s + r.nilai, 0);
  const totalTerkumpul = rows.reduce((s, r) => s + r.terkumpul, 0);
  const totalPengeluaran = rows.reduce((s, r) => s + r.pengeluaran, 0);
  const totalLaba = totalTerkumpul - totalPengeluaran;
  const totalMargin = totalTerkumpul > 0 ? Math.round((totalLaba / totalTerkumpul) * 100) : 0;

  return {
    rows,
    totals: { totalNilai, totalTerkumpul, totalPengeluaran, totalLaba, totalMargin },
  };
}
