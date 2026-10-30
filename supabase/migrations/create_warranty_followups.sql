-- Masa Garansi: tanggal BAST di project dan jadwal follow-up pasca BAST.
-- Pengganti tab Pasca BAST di Mas BIG Tracking Marketing.xlsx.
--
-- Jadwal: bulan 1, 2, 3, 6, 12, lalu tiap 12 bulan selama follow-up tidak
-- dihentikan. Semua proyek memakai aturan yang sama, termasuk proyek PT ASK,
-- dan follow-up dieksekusi manual.
--
-- WAJIB dijalankan SETELAH create_notifications.sql dan lead_auto_escalation.sql.
-- File ini idempotent -- aman dijalankan ulang.

-- =====================================================================
-- BAGIAN A -- kolom project & tabel jadwal
-- =====================================================================

alter table projects add column if not exists bast_date DATE;
alter table projects add column if not exists garansi_bulan INT not null default 3;
alter table projects add column if not exists followup_dihentikan BOOLEAN not null default false;

create table if not exists warranty_followups (
  id UUID default gen_random_uuid() primary key,
  project_id UUID not null references projects(id) on delete cascade,
  bulan_ke INT not null,
  due_date DATE not null,
  status TEXT not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  kondisi TEXT check (kondisi in ('aman', 'keluhan')),
  -- Tugas tambahan bulan itu: review Google, testimoni, atau referral.
  tugas_selesai BOOLEAN not null default false,
  catatan TEXT,
  -- Kosong pada baris skipped berarti dilewati otomatis, bukan keputusan user.
  done_at TIMESTAMPTZ,
  done_by UUID references auth.users(id) on delete set null,
  created_at TIMESTAMPTZ default now(),
  unique (project_id, bulan_ke)
);

create index if not exists idx_warranty_followups_due on warranty_followups(status, due_date);

alter table warranty_followups enable row level security;

drop policy if exists "Authenticated users full access to warranty_followups" on warranty_followups;
create policy "Authenticated users full access to warranty_followups"
  on warranty_followups for all
  to authenticated
  using (true)
  with check (true);

-- =====================================================================
-- BAGIAN B -- project Selesai wajib punya tanggal BAST
-- =====================================================================
-- Hanya saat status berubah, supaya project Selesai lama tetap bisa diedit.

create or replace function guard_project_bast()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Done' and new.bast_date is null
     and (tg_op = 'INSERT' or old.status is distinct from 'Done') then
    raise exception 'Tidak bisa menandai project Selesai: tanggal BAST wajib diisi.';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_guard_bast on projects;
create trigger projects_guard_bast
before insert or update on projects
for each row execute function guard_project_bast();

-- =====================================================================
-- BAGIAN C -- jadwal mengikuti tanggal BAST
-- =====================================================================
-- Baris pending dan yang dilewati otomatis dibuat ulang, jadi mengganti
-- tanggal BAST menggeser jadwal tanpa menyentuh hasil follow-up yang sudah
-- dicatat. Jatuh tempo lebih dari 30 hari lalu langsung dilewati, supaya
-- project lama yang baru diisi BAST-nya tidak memunculkan tumpukan telat.

create or replace function sync_warranty_schedule(p_project_id uuid, p_bast date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff date := (now() at time zone 'Asia/Jakarta')::date - 30;
  v_month int := 0;
  v_due date;
begin
  delete from warranty_followups
  where project_id = p_project_id
    and (status = 'pending' or (status = 'skipped' and done_at is null));

  if p_bast is null then
    return;
  end if;

  loop
    v_month := case
      when v_month < 3 then v_month + 1
      when v_month = 3 then 6
      when v_month = 6 then 12
      else v_month + 12
    end;
    v_due := (p_bast + make_interval(months => v_month))::date;

    insert into warranty_followups (project_id, bulan_ke, due_date, status)
    values (p_project_id, v_month, v_due, case when v_due < v_cutoff then 'skipped' else 'pending' end)
    on conflict (project_id, bulan_ke) do nothing;

    exit when v_month >= 12 and exists (
      select 1 from warranty_followups
      where project_id = p_project_id and status = 'pending' and bulan_ke >= 12
    );
  end loop;
end;
$$;

create or replace function handle_project_bast_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.bast_date is not null then
      perform sync_warranty_schedule(new.id, new.bast_date);
    end if;
  elsif new.bast_date is distinct from old.bast_date
     or (old.followup_dihentikan and not new.followup_dihentikan) then
    perform sync_warranty_schedule(new.id, new.bast_date);
  end if;
  return new;
end;
$$;

drop trigger if exists projects_handle_bast_change on projects;
create trigger projects_handle_bast_change
after insert or update on projects
for each row execute function handle_project_bast_change();

-- =====================================================================
-- BAGIAN D -- follow-up selesai: jadwal tahunan berikutnya & bersihkan notifikasi
-- =====================================================================

create or replace function handle_warranty_followup_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project projects%rowtype;
begin
  if new.status = 'pending' or old.status <> 'pending' then
    return new;
  end if;

  update notifications
  set read = true
  where type = 'warranty_followup_due' and entity_id = new.id;

  if new.bulan_ke >= 12 then
    select * into v_project from projects where id = new.project_id;
    if v_project.bast_date is not null and not v_project.followup_dihentikan then
      insert into warranty_followups (project_id, bulan_ke, due_date)
      values (
        new.project_id,
        new.bulan_ke + 12,
        (v_project.bast_date + make_interval(months => new.bulan_ke + 12))::date
      )
      on conflict (project_id, bulan_ke) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists warranty_followups_closed on warranty_followups;
create trigger warranty_followups_closed
after update on warranty_followups
for each row execute function handle_warranty_followup_closed();

-- =====================================================================
-- BAGIAN E -- pengingat harian lewat pg_cron
-- =====================================================================

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check
  check (type in (
    'follow_up_due', 'project_overdue', 'invoice_overdue',
    'lead_stale', 'lead_survey_overdue', 'lead_auto_lost',
    'warranty_followup_due'
  ));

-- Dikirim ke semua user: projects.assigned_to tidak selalu berisi id user.
create or replace function run_warranty_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  target_id uuid;
begin
  for r in
    select f.id, f.bulan_ke, p.id as project_id, p.name
    from warranty_followups f
    join projects p on p.id = f.project_id
    where f.status = 'pending'
      and f.due_date <= (now() at time zone 'Asia/Jakarta')::date
      and not p.followup_dihentikan
  loop
    for target_id in select id from auth.users loop
      insert into notifications (user_id, type, title, body, link, entity_id, read)
      values (
        target_id,
        'warranty_followup_due',
        'Follow-up garansi: ' || r.name,
        'Follow-up bulan ke-' || r.bulan_ke || ' sudah jatuh tempo.',
        '/garansi',
        r.id,
        false
      )
      on conflict (user_id, type, entity_id) do nothing;
    end loop;
  end loop;
end;
$$;

create extension if not exists pg_cron;

-- Jalan tiap hari jam 01:05 UTC (~08:05 WIB). Kalau errornya "job already
-- exists", jalankan dulu: select cron.unschedule('warranty-reminders-daily');
select cron.schedule(
  'warranty-reminders-daily',
  '5 1 * * *',
  $$ select run_warranty_reminders(); $$
);
