// Fungsi format terpusat. Selalu import dari sini, bukan inline.

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function formatDateLocale(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
