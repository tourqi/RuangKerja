import type { ReactNode } from "react";

export type StatusTone = "neutral" | "active" | "warning" | "success" | "danger";

const DOT: Record<StatusTone, string> = {
  neutral: "bg-faint",
  active: "bg-accent",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
};

/** Status ditampilkan sebagai titik warna + teks, bukan pill pastel. */
export function StatusDot({ tone, children, className = "" }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink whitespace-nowrap ${className}`}>
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${DOT[tone]}`} />
      {children}
    </span>
  );
}

// Peta status → tone, satu tempat untuk seluruh aplikasi.
export const PROJECT_STATUS_TONE: Record<string, StatusTone> = {
  Planning: "neutral",
  Design: "active",
  Production: "active",
  Installation: "active",
  Done: "success",
};

export const INVOICE_STATUS_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  sent: "active",
  partial: "warning",
  paid: "success",
  overdue: "danger",
};

export const RAB_STATUS_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  sent: "active",
  approved: "success",
};

export const PRODUCT_STATUS_TONE: Record<string, StatusTone> = {
  Draft: "neutral",
  "Perlu validasi": "warning",
  Final: "success",
  Ditunda: "neutral",
};

export const EXPERIMENT_STATUS_TONE: Record<string, StatusTone> = {
  "Belum mulai": "neutral",
  Berjalan: "active",
  Selesai: "success",
};

export const WARRANTY_STATUS_TONE: Record<string, StatusTone> = {
  pending: "neutral",
  done: "success",
  skipped: "neutral",
};

export const LEAD_STATUS_TONE: Record<string, StatusTone> = {
  "New Lead": "neutral",
  Contacted: "active",
  Survey: "active",
  Deal: "warning",
  "Deal Won": "success",
  "Deal Lost": "danger",
};
