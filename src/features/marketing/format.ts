/** Rasio 0–1 jadi persen bulat, atau — kalau tidak bisa dihitung. */
export function formatRatio(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

/** "2026-11" jadi "November 2026". */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}
