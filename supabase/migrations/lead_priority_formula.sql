-- Prioritas 5 audit: Logika Priority Otomatis (rule #2).
--
-- Sebelumnya leads.priority adalah dropdown bebas (low/medium/high/urgent)
-- tanpa validasi apa pun -- tidak ada yang menghitungnya dari budget, source,
-- riwayat client, atau jumlah follow-up tanpa respon seperti yang diminta
-- rules. Migration ini membuat leads.priority jadi derived read-only column,
-- sama pola dengan clients.lead_status (sync_client_lead_status.sql) dan
-- status transition guard (lead_state_machine.sql).
--
-- Formula (rule #2):
--   High   : budget > 500jt ATAU (source = Referral DAN client pernah
--            punya lead lain berstatus Deal Won)
--   Low    : sudah follow-up >= 2x tanpa respon, ATAU budget kecil
--            (< 50jt), ATAU source tidak jelas (kosong -- vocabulary SOURCES
--            di constants/options.ts semuanya sudah "jelas", jadi "tidak
--            jelas" = null/kosong)
--   Medium : default kalau tidak ada kriteria khusus di atas
--
-- Precedence (tidak dispesifikasikan eksplisit di rules, jadi ini keputusan
-- desain -- no_response_count dicek PALING DULU karena itu sinyal perilaku
-- paling konkret/terkini, harus menang lawan budget besar sekalipun):
--   1) no_response_count >= 2                       -> low
--   2) budget > 500jt OR (Referral + pernah Deal Won) -> high
--   3) budget < 50jt OR source kosong                -> low
--   4) default                                        -> medium
--
-- WAJIB dijalankan SETELAH lead_state_machine.sql (butuh status 'Deal Won').

-- 1) kolom baru: berapa kali follow-up tanpa respon (juga dipakai rule #3
--    auto-lost, di luar scope migration ini).
alter table leads add column if not exists no_response_count INT not null default 0;

-- 2) fungsi murni: hitung priority dari input, tanpa efek samping/query
--    tambahan selain baca leads (buat cek riwayat Deal Won client).
create or replace function compute_lead_priority(
  p_budget NUMERIC,
  p_source TEXT,
  p_client_id UUID,
  p_no_response_count INT,
  p_lead_id UUID
) returns TEXT
language plpgsql
stable
as $$
declare
  v_has_won_history boolean;
begin
  if p_no_response_count >= 2 then
    return 'low';
  end if;

  v_has_won_history := exists (
    select 1 from leads
    where client_id = p_client_id
      and status = 'Deal Won'
      and id is distinct from p_lead_id
  );

  if (p_budget is not null and p_budget > 500000000)
     or (p_source = 'Referral' and v_has_won_history) then
    return 'high';
  end if;

  if (p_budget is not null and p_budget < 50000000) or p_source is null or btrim(p_source) = '' then
    return 'low';
  end if;

  return 'medium';
end;
$$;

-- 3) trigger: overwrite priority tiap insert/update -- priority TIDAK BOLEH
--    lagi jadi input manual bebas, apa pun yang dikirim caller akan ditimpa.
create or replace function set_lead_priority()
returns trigger
language plpgsql
as $$
begin
  new.priority := compute_lead_priority(new.budget, new.source, new.client_id, new.no_response_count, new.id);
  return new;
end;
$$;

drop trigger if exists leads_set_priority on leads;
create trigger leads_set_priority
before insert or update on leads
for each row execute function set_lead_priority();

-- 4) saat sebuah lead menang (Deal Won), kriteria "pernah Deal Won" jadi
--    terpenuhi buat lead LAIN milik client yang sama -- priority mereka
--    perlu direcompute. "Touch" updated_at sibling leads supaya trigger di
--    langkah 3 ikut jalan ulang buat mereka, tanpa duplikasi rumus.
create or replace function touch_sibling_leads_priority()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Deal Won' and old.status is distinct from new.status then
    update leads
    set updated_at = now()
    where client_id = new.client_id
      and id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_touch_sibling_priority on leads;
create trigger leads_touch_sibling_priority
after update on leads
for each row execute function touch_sibling_leads_priority();

-- 5) backfill: recompute priority semua lead yang sudah ada, dengan cara
--    "touch" semua baris (fire trigger langkah 3 lewat UPDATE no-op) --
--    supaya rumusnya dihitung oleh fungsi yang sama persis, bukan disalin
--    ulang di sini.
update leads set updated_at = updated_at;
