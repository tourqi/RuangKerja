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
  lead_status?: string;
  source?: string;
  priority?: string;
}

export type LeadStatus = 'New Lead' | 'Contacted' | 'Survey' | 'Deal' | 'Lost';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Lead {
  id: string;
  client_id: string;
  status: LeadStatus;
  priority?: Priority;
  source?: string;
  follow_up_date?: string;
  last_contacted_at?: string;
  closed_at?: string;
  updated_at?: string;
  notes?: string;
  stage_order?: number;
  assigned_to?: string;
  created_by?: string;
  created_at?: string;
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
  created_at?: string;
}

export type RabStatus = 'draft' | 'sent' | 'approved';

export interface SkemaPembayaran {
  persen: number;
  keterangan: string;
}

export interface Rab {
  id: string;
  lead_id: string;
  nama: string;
  status: RabStatus;
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

export type NotificationType = 'follow_up_due' | 'project_overdue' | 'invoice_overdue';

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
