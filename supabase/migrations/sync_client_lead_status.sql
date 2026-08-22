-- Sinkronisasi Client.lead_status <-> Leads.status (audit rule #5)
--
-- Sebelumnya clients.lead_status adalah kolom bebas yang diisi manual lewat
-- form, terpisah dari leads.status, dan memakai vocabulary status yang beda
-- (Meeting Scheduled/Proposal Sent/Negotiation/Deal Won/Deal Lost) dari
-- leads.status (New Lead/Contacted/Survey/Deal/Lost). Akibatnya
-- Client.lead_status bisa mismatch dari status Lead paling aktif milik
-- client tsb, dan tidak ada cara mendeteksinya.
--
-- Migration ini membuat clients.lead_status jadi derived read-only column:
-- selalu mengikuti status dari lead client tsb yang paling terakhir
-- diupdate (fallback ke created_at kalau updated_at kosong).

-- 1) Normalisasi data lama: nilai lead_status yang sudah tidak ada di
--    vocabulary leads.status (peninggalan CLIENT_LEAD_STATUSES lama)
--    dikosongkan dulu supaya tidak melanggar constraint baru di bawah.
--    Backfill di langkah 5 akan mengisi ulang dengan nilai yang benar.
update clients
set lead_status = null
where lead_status is not null
  and lead_status not in ('New Lead', 'Contacted', 'Survey', 'Deal', 'Lost', 'Deal Won', 'Deal Lost');

-- 2) clients.lead_status sekarang wajib memakai vocabulary yang sama persis
--    dengan leads.status. Sengaja pakai SUPERSET status lama ('Deal', 'Lost')
--    DAN status baru pasca split Deal->Deal Won/Deal Lost (lihat
--    lead_state_machine.sql) -- supaya file ini aman dijalankan/dijalankan
--    ulang di kedua arah urutan relatif terhadap lead_state_machine.sql
--    tanpa saling meregresi constraint satu sama lain. lead_state_machine.sql
--    tetap yang mempersempitnya ke vocabulary final begitu sudah dijalankan.
alter table clients drop constraint if exists clients_lead_status_check;
alter table clients
  add constraint clients_lead_status_check
  check (lead_status is null or lead_status in
    ('New Lead', 'Contacted', 'Survey', 'Deal', 'Lost', 'Deal Won', 'Deal Lost'));

-- 3) Fungsi untuk recompute lead_status satu client dari lead terbarunya.
create or replace function sync_client_lead_status(p_client_id uuid)
returns void
language plpgsql
as $$
begin
  update clients c
  set lead_status = (
    select l.status
    from leads l
    where l.client_id = p_client_id
    order by coalesce(l.updated_at, l.created_at) desc nulls last
    limit 1
  )
  where c.id = p_client_id;
end;
$$;

-- 4) Trigger di tabel leads: setiap insert/update/delete langsung recompute
--    lead_status milik client terkait (dan client lama kalau client_id
--    lead dipindah).
create or replace function trg_sync_client_lead_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform sync_client_lead_status(old.client_id);
    return old;
  else
    perform sync_client_lead_status(new.client_id);
    if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
      perform sync_client_lead_status(old.client_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists leads_sync_client_lead_status on leads;
create trigger leads_sync_client_lead_status
after insert or update or delete on leads
for each row execute function trg_sync_client_lead_status();

-- 5) Backfill: recompute lead_status semua client yang sudah ada sekarang.
do $$
declare
  r record;
begin
  for r in select id from clients loop
    perform sync_client_lead_status(r.id);
  end loop;
end $$;
