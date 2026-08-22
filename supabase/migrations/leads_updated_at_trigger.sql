-- Fix: leads.updated_at never actually updates.
--
-- Ditemukan waktu desain auto-eskalasi (lead_auto_escalation.sql): kolom
-- updated_at cuma di-set sekali lewat DEFAULT now() pas INSERT -- nggak ada
-- trigger yang nge-bump dia pas UPDATE. Akibatnya kolom "Updated At" yang
-- ditampilkan di LeadsTable beku dari tanggal lead dibuat, padahal
-- kelihatannya kayak "terakhir diedit". Ini juga dipakai sebagai fallback
-- ordering di sync_client_lead_status()/sync_lead_nominal_deal() (via
-- coalesce(updated_at, created_at)) -- sekarang jadi lebih akurat setelah
-- fix ini.

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leads_touch_updated_at on leads;
create trigger leads_touch_updated_at
before update on leads
for each row execute function touch_updated_at();
