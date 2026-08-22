-- Client.priority derived dari priority lead paling aktif — sama pola
-- dengan clients.lead_status (sync_client_lead_status.sql).
--
-- Sebelumnya clients.priority manual, independen dari leads.priority, dan
-- casing-nya beda (Capitalized: 'Low'/'Medium'/'High'/'Urgent') dari
-- leads.priority yang lowercase hasil formula otomatis
-- (lead_priority_formula.sql: 'low'/'medium'/'high'/'urgent') -- dua
-- representasi buat konsep yang sama, gampang nggak nyambung kalau
-- dibandingkan/dilaporkan bareng.
--
-- Migration ini meluaskan sync_client_lead_status() (sudah ada, dipanggil
-- dari trigger leads_sync_client_lead_status yang sudah terpasang) supaya
-- SEKALIAN nyalin priority dari lead yang sama (lead paling terakhir
-- diupdate) -- satu resolusi "lead paling aktif", dua kolom, nggak perlu
-- trigger/fungsi terpisah.
--
-- WAJIB dijalankan SETELAH sync_client_lead_status.sql & lead_priority_formula.sql
-- (butuh leads.priority sudah berupa hasil formula lowercase). Disarankan
-- (tidak wajib) setelah leads_updated_at_trigger.sql juga, supaya ordering
-- "lead paling aktif" lebih akurat.

-- 1) Normalisasi data lama: value capitalized/di luar vocabulary baru
--    dikosongkan dulu, biar nggak melanggar constraint di bawah. Backfill di
--    langkah 3 ngisi ulang dengan nilai yang benar.
update clients
set priority = null
where priority is not null
  and priority not in ('low', 'medium', 'high', 'urgent');

-- 2) clients.priority sekarang wajib pakai vocabulary yang sama persis
--    dengan leads.priority.
alter table clients drop constraint if exists clients_priority_check;
alter table clients
  add constraint clients_priority_check
  check (priority is null or priority in ('low', 'medium', 'high', 'urgent'));

-- 3) sync_client_lead_status() sekarang sekalian nyalin priority dari lead
--    yang sama (satu subquery "lead paling aktif" dipakai buat dua kolom).
create or replace function sync_client_lead_status(p_client_id uuid)
returns void
language plpgsql
as $$
begin
  update clients c
  set lead_status = latest.status,
      priority = latest.priority
  from (
    select l.status, l.priority
    from leads l
    where l.client_id = p_client_id
    order by coalesce(l.updated_at, l.created_at) desc nulls last
    limit 1
  ) latest
  where c.id = p_client_id;
end;
$$;

-- 4) Backfill: recompute lead_status + priority semua client yang sudah ada.
do $$
declare
  r record;
begin
  for r in select id from clients loop
    perform sync_client_lead_status(r.id);
  end loop;
end $$;
