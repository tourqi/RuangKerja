export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at?: string;
  project_name?: string;
  property_type?: string;
  budget_range?: string;
  /**
   * Derived read-only: di-sync otomatis dari status Lead paling terakhir milik
   * client ini (trigger sync_client_lead_status di DB). Jangan di-set manual
   * dari form — lihat ClientFormModal.
   */
  lead_status?: LeadStatus;
  source?: string;
  /**
   * Derived read-only: di-sync otomatis dari priority Lead paling terakhir
   * milik client ini (sync_client_lead_status di DB, lihat
   * client_priority_from_lead.sql). Jangan di-set manual dari form.
   */
  priority?: Priority;
}

// "Deal" = tahap negosiasi (belum final). "Deal Won"/"Deal Lost" = hasil akhir,
// masing-masing butuh field syarat sendiri sebelum lead boleh pindah ke sana —
// lihat guard_lead_status_transition() di supabase/migrations/lead_state_machine.sql.
export type LeadStatus = 'New Lead' | 'Contacted' | 'Survey' | 'Deal' | 'Deal Won' | 'Deal Lost';

// 'urgent' dipertahankan cuma buat kompatibilitas data lama (mis. seed) —
// formula compute_lead_priority() di lead_priority_formula.sql cuma pernah
// menghasilkan low/medium/high, tidak pernah 'urgent'.
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  client_id: string;
  status: LeadStatus;
  /**
   * Derived read-only: di-hitung otomatis dari budget/source/riwayat Deal Won
   * client/no_response_count lewat trigger set_lead_priority() di DB. Jangan
   * di-set manual dari form — lihat LeadFormModal.
   */
  priority?: Priority;
  source?: string;
  project_name?: string;
  follow_up_date?: string;
  last_contacted_at?: string;
  closed_at?: string;
  updated_at?: string;
  notes?: string;
  stage_order?: number;
  assigned_to?: string;
  created_by?: string;
  created_at?: string;
  segmen?: string;
  area?: string;
  /** Perekomendasi saat source = Referral, mis. "PT ASK" atau nama teman. */
  referred_by?: string;
  /** Otomatis terisi saat masuk status Survey, bisa dikoreksi di form. */
  survey_date?: string;
  /** Syarat transisi Contacted → Survey. */
  lokasi_survey?: string;
  /** Estimasi budget client, syarat transisi Survey → Deal & input formula priority. */
  budget?: number;
  /** Nilai deal final, syarat transisi Deal → Deal Won. */
  nominal_deal?: number;
  /** Alasan/catatan lost, syarat transisi Deal → Deal Lost. */
  alasan_lost?: string;
  /** Berapa kali follow-up tanpa respon — input formula priority (rule #2) & auto-lost (rule #3). */
  no_response_count?: number;
  /** Auto-flag oleh cron run_lead_escalation(): status Contacted > 7 hari tanpa kontak terbaru (rule #3). */
  is_stale?: boolean;
  /** Internal bookkeeping oleh cron run_lead_escalation() — cegah alert Survey-overdue berulang tiap hari. */
  survey_overdue_alerted?: boolean;
}

export type LeadContactChannel = 'call' | 'whatsapp' | 'email' | 'meeting' | 'other';

/** Log kontak (call/WA/dll) — syarat minimal 1 record sebelum lead boleh pindah ke Contacted. */
export type LeadContactHasil = 'direspons' | 'tidak_direspons';

export interface LeadContact {
  id: string;
  lead_id: string;
  channel: LeadContactChannel;
  notes?: string;
  /** Kosong pada catatan lama. Trigger apply_lead_contact() memperbarui lead dari sini. */
  hasil?: LeadContactHasil;
  next_follow_up?: string;
  created_by?: string;
  created_at?: string;
}

export type ProductTangga = 'Entry' | 'Core' | 'Upsell' | 'Retensi';
export type ProductStatus = 'Draft' | 'Perlu validasi' | 'Final' | 'Ditunda';
export type ProductPrioritas = 'Utama' | 'Pendukung' | 'Ditunda';

export interface Product {
  id: string;
  kode: string;
  nama: string;
  lini?: string;
  kategori: string;
  deskripsi?: string;
  deliverable?: string;
  sudah_termasuk?: string;
  tidak_termasuk?: string;
  satuan?: string;
  harga_mulai?: number;
  harga_sampai?: number;
  estimasi_durasi?: string;
  segmen?: string;
  tangga?: ProductTangga;
  status: ProductStatus;
  catatan?: string;
  prioritas?: ProductPrioritas;
  aktif: boolean;
  created_at?: string;
}

export interface LeadProduct {
  lead_id: string;
  product_id: string;
  /** false = baru diminati. Otomatis true saat lead jadi Deal Won (trigger di create_products.sql). */
  dibeli: boolean;
  created_at?: string;
}

/** Baris lead_products plus status lead-nya, bahan hitung laporan produk. */
export interface LeadProductUsage extends LeadProduct {
  lead_status?: LeadStatus;
}

export type ProjectStatus = 'Planning' | 'Design' | 'Production' | 'Installation' | 'Done';

export const projectStatusLabel: Record<ProjectStatus, string> = {
  Planning: 'Planning',
  Design: 'Design',
  Production: 'Produksi',
  Installation: 'Instalasi',
  Done: 'Selesai',
};

export interface Project {
  id: string;
  client_id?: string;
  lead_id?: string;
  name: string;
  value?: number;
  status: ProjectStatus;
  start_date?: string;
  deadline?: string;
  assigned_to?: string;
  progress?: number;
  /** Tanggal serah terima, wajib saat status Selesai. Jadwal garansi dihitung dari sini. */
  bast_date?: string;
  garansi_bulan?: number;
  followup_dihentikan?: boolean;
  created_at?: string;
}

export interface MarketingKpiMonthly {
  /** Selalu tanggal 1 di bulan tersebut (YYYY-MM-01). */
  bulan: string;
  review_google_total?: number | null;
  budget_iklan?: number | null;
}

export type ExperimentStatus = 'Belum mulai' | 'Berjalan' | 'Selesai';

export interface MarketingExperiment {
  id: string;
  nama: string;
  hipotesis?: string;
  cara_uji?: string;
  metrik?: string;
  baseline?: string;
  hasil?: string;
  mulai?: string;
  batas_evaluasi?: string;
  status: ExperimentStatus;
  keputusan?: string;
  created_at?: string;
}

export type WarrantyFollowupStatus = 'pending' | 'done' | 'skipped';
export type WarrantyKondisi = 'aman' | 'keluhan';

export interface WarrantyFollowup {
  id: string;
  project_id: string;
  bulan_ke: number;
  due_date: string;
  status: WarrantyFollowupStatus;
  kondisi?: WarrantyKondisi;
  tugas_selesai: boolean;
  catatan?: string;
  done_at?: string;
  done_by?: string;
  created_at?: string;
}

export type RabStatus = 'draft' | 'sent' | 'approved';
export type RabOpsi = 'Standar' | 'Hemat';

export interface SkemaPembayaran {
  persen: number;
  keterangan: string;
}

export interface Rab {
  id: string;
  lead_id: string;
  nama: string;
  status: RabStatus;
  /** Tanggal SPH: otomatis terisi saat RAB pertama kali Terkirim/Disetujui. */
  sent_at?: string;
  opsi?: RabOpsi;
  diskon_persen?: number;
  diskon_nilai?: number;
  skema_pembayaran?: SkemaPembayaran[];
  created_at?: string;
  updated_at?: string;
}

export interface RabGroup {
  id: string;
  rab_id: string;
  no: number;
  deskripsi: string;
  created_at?: string;
  items?: RabItem[];
}

export interface RabItem {
  id: string;
  group_id: string;
  spesifikasi: string;
  qty: number;
  unit: string;
  harga: number;
  sort_order: number;
  dimensi_p?: number;
  dimensi_l?: number;
  created_at?: string;
}

export type UserRole = 'owner' | 'designer' | 'sales';

export interface Profile {
  id: string;
  name?: string;
  role: UserRole;
  email?: string;
  created_at?: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
export type PaymentMethod = 'transfer' | 'cash' | 'check';

export interface Invoice {
  id: string;
  client_id?: string;
  lead_id?: string;
  project_id?: string;
  rab_id?: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  invoice_date?: string;
  due_date?: string;
  notes?: string;
  diskon_persen?: number;
  diskon_nilai?: number;
  created_by?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
  created_at?: string;
}

export type ExpenseCategory = 'material' | 'jasa' | 'transport' | 'lainnya';

export interface ProjectExpense {
  id: string;
  project_id: string;
  tanggal: string;
  deskripsi: string;
  kategori: ExpenseCategory;
  jumlah: number;
  vendor?: string;
  notes?: string;
  created_at?: string;
}

export type GeneralExpenseKategori = 'operasional' | 'marketing' | 'gaji' | 'lainnya';

export interface GeneralExpense {
  id: string;
  tanggal: string;
  deskripsi: string;
  kategori: GeneralExpenseKategori;
  sub_kategori?: string;
  jumlah: number;
  vendor?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export type NotificationType =
  | 'follow_up_due'
  | 'project_overdue'
  | 'invoice_overdue'
  | 'lead_stale'
  | 'lead_survey_overdue'
  | 'lead_auto_lost'
  | 'warranty_followup_due';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  entity_id?: string;
  read: boolean;
  created_at?: string;
}
