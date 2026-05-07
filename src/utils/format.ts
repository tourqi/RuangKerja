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

export function formatRupiah(value?: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value?: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}
