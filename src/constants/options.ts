// Sumber tunggal untuk semua option dropdown di seluruh aplikasi.
// Selalu import dari sini, jangan hardcode di komponen.

// "Deal" = negosiasi (belum final), lanjut ke "Deal Won" atau "Deal Lost".
// Masing-masing status tujuan punya syarat field sendiri sebelum lead boleh
// pindah ke sana — lihat guard_lead_status_transition() di
// supabase/migrations/lead_state_machine.sql dan utils/leadStatusGuard.ts.
export const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Survey",
  "Deal",
  "Deal Won",
  "Deal Lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_COLORS: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Survey: "bg-purple-100 text-purple-800",
  Deal: "bg-indigo-100 text-indigo-800",
  "Deal Won": "bg-green-100 text-green-800",
  "Deal Lost": "bg-red-100 text-red-800",
};

// ------------------------------------------------------------------

export const LEAD_CONTACT_CHANNELS = ["call", "whatsapp", "email", "meeting", "other"] as const;

export const LEAD_CONTACT_CHANNEL_LABELS: Record<string, string> = {
  call: "Telepon",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meeting",
  other: "Lainnya",
};

// ------------------------------------------------------------------

// Client.lead_status TIDAK LAGI input manual — nilainya di-derive otomatis dari
// status Lead paling terakhir milik client (lihat trigger sync_client_lead_status
// di supabase/migrations). Vocabulary-nya karena itu WAJIB sama persis dengan
// LEAD_STATUSES supaya Client.lead_status tidak pernah menyimpan nilai yang
// tidak mungkin ada di Leads (mencegah Client.status != Leads.status).
export const CLIENT_LEAD_STATUSES = LEAD_STATUSES;
export const CLIENT_LEAD_STATUS_COLORS = LEAD_STATUS_COLORS;

// ------------------------------------------------------------------

export const PROJECT_STATUSES = [
  "Planning",
  "Design",
  "Production",
  "Installation",
  "Done",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  Planning: "Planning",
  Design: "Design",
  Production: "Produksi",
  Installation: "Instalasi",
  Done: "Selesai",
};

export const PROJECT_STATUS_COLORS: Record<string, string> = {
  Planning: "bg-gray-100 text-gray-700",
  Design: "bg-blue-100 text-blue-800",
  Production: "bg-yellow-100 text-yellow-800",
  Installation: "bg-purple-100 text-purple-800",
  Done: "bg-green-100 text-green-800",
};

// ------------------------------------------------------------------

// Nilai yang disimpan di DB adalah lowercase sesuai tipe Priority di db.ts
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
  // Fallback untuk data lama yang mungkin menyimpan capitalized
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

// ------------------------------------------------------------------

export const SOURCES = [
  "Instagram",
  "TikTok",
  "Website",
  "Referral",
  "Walk-in",
  "Marketplace",
  "Ads (Google/Facebook)",
] as const;

export type Source = (typeof SOURCES)[number];

// ------------------------------------------------------------------

export const PROPERTY_TYPES = ["Rumah", "Ruko", "Apartemen", "Tanah"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

// ------------------------------------------------------------------

export const BUDGET_RANGES = ["< 500jt", "500jt - 1M", "> 1M"] as const;

export type BudgetRange = (typeof BUDGET_RANGES)[number];

// ------------------------------------------------------------------

export const INVOICE_STATUSES = [
  "draft",
  "sent",
  "partial",
  "paid",
  "overdue",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Terkirim",
  partial: "Sebagian",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

// ------------------------------------------------------------------

// Helper: konversi array string menjadi option untuk MultiSelect
export function toOptions(values: readonly string[], labels?: Record<string, string>) {
  return values.map((v) => ({ value: v, label: labels?.[v] ?? v }));
}
