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
  "New Lead": "tone-neutral",
  Contacted: "tone-active",
  Survey: "tone-active",
  Deal: "tone-warning",
  "Deal Won": "tone-success",
  "Deal Lost": "tone-danger",
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
  Planning: "tone-neutral",
  Design: "tone-active",
  Production: "tone-active",
  Installation: "tone-active",
  Done: "tone-success",
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
  low: "tone-neutral",
  medium: "tone-active",
  high: "tone-warning",
  urgent: "tone-danger",
  // Fallback untuk data lama yang mungkin menyimpan capitalized
  Low: "tone-neutral",
  Medium: "tone-active",
  High: "tone-warning",
  Urgent: "tone-danger",
};

// ------------------------------------------------------------------

// "Referral" dipakai compute_lead_priority() di DB, jangan diganti namanya.
export const SOURCES = [
  "Referral",
  "Google Maps",
  "Instagram",
  "Threads",
  "TikTok",
  "Iklan Meta",
  "Website",
  "Klien Lama",
  "Lainnya",
] as const;

export type Source = (typeof SOURCES)[number];

/** Nilai leads.referred_by untuk lead dari PT ASK, dipakai KPI porsi omzet ASK. */
export const REFERRAL_ASK = "PT ASK";

export const LEAD_SEGMEN = ["Homeowners", "Partner B2B", "Kantor", "Cafe & Restoran"] as const;

export const LEAD_AREAS = ["Bogor", "Jakarta", "Depok", "Bekasi", "Tangerang", "Lainnya"] as const;

export const LOST_REASONS = [
  "Harga",
  "Pilih tukang harian",
  "Pilih vendor lain",
  "Ditunda",
  "Tidak ada respons",
  "Di luar area",
  "Lainnya",
] as const;

export const RAB_OPSI = ["Standar", "Hemat"] as const;

export const LEAD_CONTACT_HASIL_LABELS: Record<string, string> = {
  direspons: "Direspons",
  tidak_direspons: "Tidak direspons",
};

// ------------------------------------------------------------------

/** Angka acuan dari KPI Bulanan di sheet tracking. */
export const MARKETING_TARGETS = {
  reviewAwal: 17,
  reviewTarget: 30,
  batasPorsiAsk: 0.5,
};

export const EXPERIMENT_STATUSES = ["Belum mulai", "Berjalan", "Selesai"] as const;

// ------------------------------------------------------------------

export const WARRANTY_STATUS_LABELS: Record<string, string> = {
  pending: "Belum",
  done: "Selesai",
  skipped: "Dilewati",
};

export const WARRANTY_KONDISI_LABELS: Record<string, string> = {
  aman: "Aman",
  keluhan: "Ada keluhan",
};

/** Tugas tambahan follow-up, per bulan ke-. Bulan lain tidak punya tugas tambahan. */
export const WARRANTY_TUGAS: Record<number, string> = {
  1: "Minta review Google",
  2: "Minta testimoni",
  3: "Tawarkan referral",
};

// ------------------------------------------------------------------

export const PRODUCT_LINI = ["Desain Studio", "Interior & Konstruksi", "Maintenance"] as const;

export const PRODUCT_KATEGORI = [
  "Desain",
  "Custom Furniture",
  "Finishing Interior",
  "Sipil & Renovasi",
  "Proyek Komersial",
  "Perawatan",
] as const;

export const PRODUCT_SATUAN = ["per ruangan", "per m²", "per unit", "per set", "per proyek"] as const;

export const PRODUCT_SEGMEN = ["Semua Segmen", "Homeowners", "Cafe & Restoran", "Perusahaan / Kantor"] as const;

export const PRODUCT_TANGGA = ["Entry", "Core", "Upsell", "Retensi"] as const;

export const PRODUCT_TANGGA_LABELS: Record<string, string> = {
  Entry: "Entry (pintu masuk)",
  Core: "Core (produk utama)",
  Upsell: "Upsell (tambahan)",
  Retensi: "Retensi (purna jual)",
};

export const PRODUCT_STATUSES = ["Draft", "Perlu validasi", "Final", "Ditunda"] as const;

export const PRODUCT_PRIORITAS = ["Utama", "Pendukung", "Ditunda"] as const;

// ------------------------------------------------------------------

export const PROPERTY_TYPES = ["Rumah", "Apartemen", "Cafe", "Toko", "Kantor"] as const;

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
  draft: "tone-neutral",
  sent: "tone-active",
  partial: "tone-warning",
  paid: "tone-success",
  overdue: "tone-danger",
};

// ------------------------------------------------------------------

// Helper: konversi array string menjadi option untuk MultiSelect
export function toOptions(values: readonly string[], labels?: Record<string, string>) {
  return values.map((v) => ({ value: v, label: labels?.[v] ?? v }));
}
