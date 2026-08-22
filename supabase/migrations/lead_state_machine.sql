-- Prioritas 2 audit: State Machine Transisi Status Lead (rule #4) + split
-- status Deal -> Deal (negosiasi) / Deal Won / Deal Lost (rule #1, #4).
--
-- Sebelumnya leads.status cuma 5 nilai (New Lead/Contacted/Survey/Deal/Lost)
-- dan "Deal" dipakai di seluruh aplikasi sebagai representasi "won" (gate
-- pembuatan Project, perhitungan invoice, dashboard, reports) -- tidak ada
-- distingsi negosiasi vs deal won vs deal lost seperti yang diminta rules.
-- Status pun bisa diganti bebas dari dropdown tanpa validasi field syarat
-- apa pun (rule #4).

-- =====================================================================
-- BAGIAN A -- split status: Deal -> Deal Won, Lost -> Deal Lost
-- =====================================================================

-- 1) Lepas constraint lama dulu (leads & clients) supaya rename data di
--    bawah tidak melanggar CHECK yang masih pakai vocabulary lama.
alter table leads drop constraint if exists leads_status_check;
alter table clients drop constraint if exists clients_lead_status_check;

-- 2) Rename data lama ke vocabulary baru. "Deal" di kode selama ini dipakai
--    sebagai representasi "won" (project baru dibuat, invoice dihitung, dst
--    saat status = Deal) -> jadi Deal Won. "Lost" -> Deal Lost.
update leads set status = 'Deal Won' where status = 'Deal';
update leads set status = 'Deal Lost' where status = 'Lost';

-- 3) Pasang constraint baru dengan 6 status resmi sesuai rules.
alter table leads
  add constraint leads_status_check
  check (status in ('New Lead', 'Contacted', 'Survey', 'Deal', 'Deal Won', 'Deal Lost'));

alter table clients
  add constraint clients_lead_status_check
  check (lead_status is null or lead_status in ('New Lead', 'Contacted', 'Survey', 'Deal', 'Deal Won', 'Deal Lost'));

-- 4) clients.lead_status di-backfill ulang (fungsi sync_client_lead_status
--    dibuat di migration sync_client_lead_status.sql sebelumnya -- migration
--    ini WAJIB dijalankan setelahnya) supaya ikut ganti mengikuti status
--    leads yang baru saja di-rename di atas.
do $$
declare
  r record;
begin
  for r in select id from clients loop
    perform sync_client_lead_status(r.id);
  end loop;
end $$;

-- =====================================================================
-- BAGIAN B -- kolom baru yang jadi syarat transisi (rule #4)
-- =====================================================================

alter table leads add column if not exists lokasi_survey TEXT;    -- syarat Contacted -> Survey
alter table leads add column if not exists budget NUMERIC;        -- syarat Survey -> Deal
alter table leads add column if not exists nominal_deal NUMERIC;  -- syarat Deal -> Deal Won
alter table leads add column if not exists alasan_lost TEXT;      -- syarat Deal -> Deal Lost

-- Log kontak (call/WA/dll) -- syarat New Lead -> Contacted: minimal 1 record.
create table if not exists lead_contacts (
  id UUID default gen_random_uuid() primary key,
  lead_id UUID not null references leads(id) on delete cascade,
  channel TEXT not null check (channel in ('call', 'whatsapp', 'email', 'meeting', 'other')),
  notes TEXT,
  created_by UUID references auth.users(id) on delete set null,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_lead_contacts_lead_id on lead_contacts(lead_id);

alter table lead_contacts enable row level security;

drop policy if exists "Authenticated users full access to lead_contacts" on lead_contacts;
create policy "Authenticated users full access to lead_contacts"
  on lead_contacts for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- BAGIAN C -- guard clause transisi status (rule #4)
-- =====================================================================
-- Setiap kali status sebuah lead BERUBAH (bukan saat field lain diedit),
-- field syarat untuk status tujuan harus sudah terisi. Berlaku dari mana pun
-- asal transisinya (defense-in-depth, tidak bergantung origin status), supaya
-- lead yang loncat tahap pun tetap harus penuhi syarat tahap yang dituju.
--
-- Sengaja HANYA di BEFORE UPDATE, bukan BEFORE INSERT: rule #4 bicara soal
-- "transisi" (pindah dari satu status ke status lain), yang cuma relevan buat
-- baris yang sudah ada. INSERT dipakai buat lead baru (selalu mulai dari
-- "New Lead" lewat form) maupun seeding/import data lama yang sudah berstatus
-- lanjut -- kalau ikut divalidasi, insert seed data (mis. supabase/seed_dummy_data.sql)
-- yang menaruh lead langsung di status "Contacted" tanpa lead_contacts yang
-- juga baru mau dibuat setelahnya akan gagal karena masalah ayam-telur.

create or replace function guard_lead_status_transition()
returns trigger
language plpgsql
as $$
begin
  -- hanya berlaku saat status benar-benar berubah
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'Contacted' then
    if not exists (select 1 from lead_contacts where lead_id = new.id) then
      raise exception 'Tidak bisa pindah ke status Contacted: minimal 1 record kontak (call/WA) harus dicatat dulu.';
    end if;
  elsif new.status = 'Survey' then
    if new.lokasi_survey is null or btrim(new.lokasi_survey) = '' then
      raise exception 'Tidak bisa pindah ke status Survey: lokasi/alamat survey wajib diisi.';
    end if;
  elsif new.status = 'Deal' then
    if new.budget is null or new.project_name is null or btrim(new.project_name) = '' then
      raise exception 'Tidak bisa pindah ke status Deal: budget dan nama project wajib diisi.';
    end if;
  elsif new.status = 'Deal Won' then
    if new.closed_at is null or new.nominal_deal is null then
      raise exception 'Tidak bisa pindah ke status Deal Won: closed_at dan nominal_deal wajib diisi.';
    end if;
  elsif new.status = 'Deal Lost' then
    if new.alasan_lost is null or btrim(new.alasan_lost) = '' then
      raise exception 'Tidak bisa pindah ke status Deal Lost: alasan/catatan lost wajib diisi.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists leads_guard_status_transition on leads;
create trigger leads_guard_status_transition
before update on leads
for each row execute function guard_lead_status_transition();
