/**
 * Nilai project = total RAB approved milik lead ini (itemized dari
 * spesifikasi/ukuran/qty yang benar-benar dipakai, live — ikut berubah kalau
 * RAB-nya diedit/di-approve ulang). Kalau belum ada RAB approved, fallback ke
 * Project.value (angka manual, biasanya cuma relevan buat project tanpa lead
 * sama sekali).
 *
 * Sengaja TIDAK fallback ke Lead.nominal_deal — itu cuma angka closing yang
 * diketik sales, belum tentu match breakdown item yang akhirnya dibikin, dan
 * getProjectValue() ini juga dipakai buat perhitungan finansial serius
 * (status lunas/belum di InvoiceDetail/InvoicesTable, margin profit/loss) —
 * angka yang belum berdasar breakdown RAB nggak boleh ikut situ. Belum ada
 * RAB approved = belum ada nilai project yang bisa dipertanggungjawabkan.
 */
export function getProjectValue(
  project: { lead_id?: string; value?: number },
  rabTotals: Record<string, number>
): number {
  if (project.lead_id && rabTotals[project.lead_id] != null) {
    return rabTotals[project.lead_id];
  }
  return project.value ?? 0;
}
