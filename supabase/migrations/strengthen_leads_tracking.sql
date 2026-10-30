-- Penguatan Leads supaya mewakili tab Lead di Mas BIG Tracking Marketing.xlsx:
-- segmen, area, perekomendasi, tanggal survey, tanggal & opsi SPH, serta log
-- interaksi yang langsung memperbarui lead.
--
-- Tanggal memakai zona Asia/Jakarta karena H+2/H+5 dihitung per hari kerja WIB.
--
-- WAJIB dijalankan SETELAH lead_state_machine.sql dan lead_priority_formula.sql.
-- File ini idempotent -- aman dijalankan ulang.

-- =====================================================================
-- BAGIAN A -- kolom baru
-- =====================================================================

alter table leads add column if not exists segmen TEXT;
alter table leads add column if not exists area TEXT;
-- Siapa yang merekomendasikan saat source = Referral. Lead PT ASK masuk
-- Referral dengan nilai 'PT ASK', dipakai KPI porsi omzet ASK.
alter table leads add column if not exists referred_by TEXT;
alter table leads add column if not exists survey_date DATE;

alter table rab add column if not exists sent_at TIMESTAMPTZ;
alter table rab add column if not exists opsi TEXT check (opsi in ('Standar', 'Hemat'));

alter table lead_contacts add column if not exists hasil TEXT check (hasil in ('direspons', 'tidak_direspons'));
alter table lead_contacts add column if not exists next_follow_up DATE;

-- =====================================================================
-- BAGIAN B -- rapikan sumber lama ke daftar sumber baru
-- =====================================================================
-- 'Referral' sengaja tetap: compute_lead_priority() bergantung pada kata ini.

update clients set source = 'Iklan Meta' where source = 'Ads (Google/Facebook)';
update leads set source = 'Iklan Meta' where source = 'Ads (Google/Facebook)';
update clients set source = 'Lainnya' where source in ('Walk-in', 'Marketplace');
update leads set source = 'Lainnya' where source in ('Walk-in', 'Marketplace');

-- =====================================================================
-- BAGIAN C -- tanggal survey otomatis saat masuk tahap Survey
-- =====================================================================

create or replace function set_lead_survey_date()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Survey' and new.status is distinct from old.status and new.survey_date is null then
    new.survey_date := (now() at time zone 'Asia/Jakarta')::date;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_set_survey_date on leads;
create trigger leads_set_survey_date
before update on leads
for each row execute function set_lead_survey_date();

-- =====================================================================
-- BAGIAN D -- RAB terkirim = SPH: catat tanggal & jadwalkan follow-up H+2
-- =====================================================================

create or replace function handle_rab_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status in ('sent', 'approved') and new.sent_at is null then
    new.sent_at := now();
  end if;

  if new.status = 'sent' then
    update leads
    set follow_up_date = (now() at time zone 'Asia/Jakarta')::date + 2
    where id = new.lead_id
      and status not in ('Deal Won', 'Deal Lost');
  end if;

  return new;
end;
$$;

drop trigger if exists rab_handle_sent on rab;
create trigger rab_handle_sent
before update on rab
for each row execute function handle_rab_sent();

-- rab.updated_at tidak selalu berubah saat status diganti, jadi tanggal SPH
-- lama ini perkiraan. Data baru tercatat tepat lewat trigger di atas.
update rab
set sent_at = coalesce(updated_at, created_at)
where status in ('sent', 'approved') and sent_at is null;

-- =====================================================================
-- BAGIAN E -- satu catatan interaksi memperbarui lead
-- =====================================================================
-- Tanggal follow-up berikutnya: pilihan user. Kalau kosong dan SPH sudah
-- dikirim, follow-up H+2 yang sudah lewat digeser ke H+5.

create or replace function apply_lead_contact()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_h5 date;
begin
  select (max(sent_at) at time zone 'Asia/Jakarta')::date + 5 into v_h5
  from rab
  where lead_id = new.lead_id and status = 'sent';

  update leads
  set last_contacted_at = greatest(coalesce(last_contacted_at, new.created_at), new.created_at),
      no_response_count = coalesce(no_response_count, 0)
        + case when new.hasil = 'tidak_direspons' then 1 else 0 end,
      follow_up_date = case
        when status in ('Deal Won', 'Deal Lost') then follow_up_date
        when new.next_follow_up is not null then new.next_follow_up
        when v_h5 > v_today and (follow_up_date is null or follow_up_date <= v_today) then v_h5
        else follow_up_date
      end
  where id = new.lead_id;

  return new;
end;
$$;

drop trigger if exists lead_contacts_apply on lead_contacts;
create trigger lead_contacts_apply
after insert on lead_contacts
for each row execute function apply_lead_contact();
