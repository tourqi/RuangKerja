// Fungsi format terpusat. Selalu import dari sini, bukan inline.

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tanggal untuk tampilan: "5 Agu 2026". Dirakit manual (bukan toLocaleDateString) supaya server & browser identik. */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d} ${BULAN[m - 1]} ${y}`;
}

/** Tanggal untuk ekspor CSV / input: "2026-08-05". */
export function formatDateISO(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

export function formatDateLocale(value?: string | null): string {
  return formatDate(value);
}

// Prefix "Rp" dirakit manual: output style "currency" dari Intl beda antar versi
// ICU (Node: "Rp 0", sebagian browser: "Rp0") sehingga memicu hydration mismatch.
const idNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function formatIDR(value: number): string {
  return `${value < 0 ? "-" : ""}Rp\u00a0${idNumber.format(Math.abs(value))}`;
}

export function formatRupiah(value?: number | null): string {
  if (value == null) return "—";
  return formatIDR(value);
}

export function formatPercent(value?: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}
