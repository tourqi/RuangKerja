-- =============================================================================
-- 0000_init_schema.sql
--
-- RuangKerja base schema, reconstructed from src/types/db.ts and the columns
-- referenced by every ALTER TABLE in this migrations folder. The repo never
-- had a tracked "create table" migration for these tables (they were created
-- ad-hoc in the Supabase dashboard), so this file exists to make the
-- migrations folder self-sufficient: running it + the rest of this folder on
-- an empty database reproduces the current schema end to end.
--
-- Safe to run against the existing project too: every statement is
-- idempotent (IF NOT EXISTS), so on a database that already has these tables
-- it is a no-op. It intentionally does NOT touch RLS/policies — those stay
-- owned by the dedicated enable_rls_*.sql / fix_profiles_role_protection.sql
-- migrations so nothing here fights with them.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per app user, keyed to auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id UUID primary key references auth.users(id) on delete cascade,
  name TEXT,
  role TEXT not null default 'sales' check (role in ('owner', 'designer', 'sales')),
  email TEXT,
  created_at TIMESTAMPTZ default now()
);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id UUID default gen_random_uuid() primary key,
  name TEXT not null,
  phone TEXT,
  address TEXT,
  notes TEXT,
  project_name TEXT,
  property_type TEXT,
  budget_range TEXT,
  lead_status TEXT,
  source TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ default now()
);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id UUID default gen_random_uuid() primary key,
  client_id UUID not null references clients(id) on delete cascade,
  status TEXT not null default 'New Lead' check (status in ('New Lead', 'Contacted', 'Survey', 'Deal', 'Lost')),
  priority TEXT check (priority in ('low', 'medium', 'high', 'urgent')),
  source TEXT,
  project_name TEXT,
  follow_up_date DATE,
  last_contacted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ default now(),
  notes TEXT,
  stage_order INT default 0,
  assigned_to UUID references auth.users(id) on delete set null,
  created_by UUID references auth.users(id) on delete set null,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_leads_client_id on leads(client_id);
create index if not exists idx_leads_status on leads(status);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id UUID default gen_random_uuid() primary key,
  client_id UUID references clients(id) on delete set null,
  lead_id UUID references leads(id) on delete set null,
  name TEXT not null,
  value NUMERIC(15, 2),
  status TEXT not null default 'Planning' check (status in ('Planning', 'Design', 'Production', 'Installation', 'Done')),
  start_date DATE,
  deadline DATE,
  assigned_to UUID references auth.users(id) on delete set null,
  progress INT default 0,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_projects_client_id on projects(client_id);
create index if not exists idx_projects_lead_id on projects(lead_id);
create index if not exists idx_projects_status on projects(status);

-- ---------------------------------------------------------------------------
-- rab / rab_groups / rab_items (Rencana Anggaran Biaya)
-- ---------------------------------------------------------------------------
create table if not exists rab (
  id UUID default gen_random_uuid() primary key,
  lead_id UUID not null references leads(id) on delete cascade,
  nama TEXT not null,
  status TEXT not null default 'draft' check (status in ('draft', 'sent', 'approved')),
  diskon_persen NUMERIC default 0,
  diskon_nilai NUMERIC default 0,
  skema_pembayaran JSONB,
  created_at TIMESTAMPTZ default now(),
  updated_at TIMESTAMPTZ default now()
);

create index if not exists idx_rab_lead_id on rab(lead_id);

create table if not exists rab_groups (
  id UUID default gen_random_uuid() primary key,
  rab_id UUID not null references rab(id) on delete cascade,
  no INT not null,
  deskripsi TEXT not null,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_rab_groups_rab_id on rab_groups(rab_id);

create table if not exists rab_items (
  id UUID default gen_random_uuid() primary key,
  group_id UUID not null references rab_groups(id) on delete cascade,
  spesifikasi TEXT not null,
  qty NUMERIC not null default 1,
  unit TEXT,
  harga NUMERIC not null default 0,
  sort_order INT default 0,
  dimensi_p NUMERIC,
  dimensi_l NUMERIC,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_rab_items_group_id on rab_items(group_id);

-- ---------------------------------------------------------------------------
-- invoices / payments
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id UUID default gen_random_uuid() primary key,
  client_id UUID references clients(id) on delete set null,
  lead_id UUID references leads(id) on delete set null,
  project_id UUID references projects(id) on delete set null,
  rab_id UUID references rab(id) on delete set null,
  invoice_number TEXT not null unique,
  total_amount NUMERIC(15, 2) not null default 0,
  paid_amount NUMERIC(15, 2) not null default 0,
  status TEXT not null default 'draft' check (status in ('draft', 'sent', 'partial', 'paid', 'overdue')),
  invoice_date DATE,
  due_date DATE,
  notes TEXT,
  diskon_persen NUMERIC default 0,
  diskon_nilai NUMERIC default 0,
  created_by UUID references auth.users(id) on delete set null,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_invoices_client_id on invoices(client_id);
create index if not exists idx_invoices_lead_id on invoices(lead_id);
create index if not exists idx_invoices_project_id on invoices(project_id);
create index if not exists idx_invoices_rab_id on invoices(rab_id);
create index if not exists idx_invoices_status on invoices(status);

create table if not exists payments (
  id UUID default gen_random_uuid() primary key,
  invoice_id UUID not null references invoices(id) on delete cascade,
  amount NUMERIC(15, 2) not null,
  payment_date DATE not null,
  payment_method TEXT not null check (payment_method in ('transfer', 'cash', 'check')),
  notes TEXT,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_payments_invoice_id on payments(invoice_id);

-- ---------------------------------------------------------------------------
-- project_expenses (biaya per proyek) — general_expenses (biaya umum
-- kantor) already has its own creation migration in add_general_expenses.sql
-- ---------------------------------------------------------------------------
create table if not exists project_expenses (
  id UUID default gen_random_uuid() primary key,
  project_id UUID not null references projects(id) on delete cascade,
  tanggal DATE not null,
  deskripsi TEXT not null,
  kategori TEXT not null check (kategori in ('material', 'jasa', 'transport', 'lainnya')),
  jumlah NUMERIC(15, 2) not null default 0,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_project_expenses_project_id on project_expenses(project_id);

-- ---------------------------------------------------------------------------
-- activity_logs — audit trail shown on lead/project/invoice/rab detail pages
-- ---------------------------------------------------------------------------
create table if not exists activity_logs (
  id UUID default gen_random_uuid() primary key,
  entity_type TEXT not null check (entity_type in ('lead', 'project', 'invoice', 'rab', 'expense', 'general_expense')),
  entity_id UUID not null,
  user_id UUID references auth.users(id) on delete set null,
  user_name TEXT,
  action TEXT not null,
  description TEXT not null,
  metadata JSONB,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_activity_logs_entity on activity_logs(entity_type, entity_id);
