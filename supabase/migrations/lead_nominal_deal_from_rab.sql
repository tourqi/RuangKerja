-- Lead.nominal_deal auto-generate dari RAB approved (kalau ada), manual
-- kalau belum ada RAB approved sama sekali.
--
-- Sebelumnya nominal_deal cuma field wajib-diisi (syarat transisi ke Deal
-- Won di lead_state_machine.sql) tanpa validasi/keterkaitan apa pun ke RAB
-- -- user bisa ketik angka berapa aja, nggak pernah dicek lawan breakdown
-- RAB yang sebenarnya (murni "tebak-tebakan"). Sekarang begitu lead punya
-- RAB approved, nominal_deal SELALU mengikuti total RAB itu (sama persis
-- logika getApprovedRabTotals() di services/rab.ts: gross item dikurangi
-- diskon_nilai, dijumlah kalau approved-nya lebih dari satu). Kalau belum
-- ada RAB approved sama sekali, nominal_deal tetap murni manual (nilai yang
-- sudah tersimpan, auto atau manual, dibiarkan apa adanya).
--
-- WAJIB dijalankan SETELAH lead_state_machine.sql (butuh kolom nominal_deal).

-- 1) Fungsi murni: recompute nominal_deal SATU lead dari RAB approved-nya.
create or replace function sync_lead_nominal_deal(p_lead_id uuid)
returns void
language plpgsql
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(
    (select coalesce(sum(ri.qty * ri.harga), 0)
     from rab_groups rg
     join rab_items ri on ri.group_id = rg.id
     where rg.rab_id = r.id)
    - coalesce(r.diskon_nilai, 0)
  ), 0)
  into v_total
  from rab r
  where r.lead_id = p_lead_id and r.status = 'approved';

  -- Cuma timpa kalau ADA RAB approved dengan total > 0. Kalau belum ada
  -- (atau baru di-unapprove/dihapus), nominal_deal yang sudah tersimpan
  -- dibiarkan apa adanya -- balik jadi field manual biasa.
  if v_total > 0 then
    update leads set nominal_deal = v_total where id = p_lead_id;
  end if;
end;
$$;

-- 2) Trigger di tabel rab: approve/unapprove, ubah diskon, atau hapus RAB
--    semuanya perlu recompute.
create or replace function trg_sync_lead_nominal_deal_from_rab()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform sync_lead_nominal_deal(old.lead_id);
    return old;
  else
    perform sync_lead_nominal_deal(new.lead_id);
    if tg_op = 'UPDATE' and old.lead_id is distinct from new.lead_id then
      perform sync_lead_nominal_deal(old.lead_id);
    end if;
    return new;
  end if;
end;
$$;

drop trigger if exists rab_sync_lead_nominal_deal on rab;
create trigger rab_sync_lead_nominal_deal
after insert or update or delete on rab
for each row execute function trg_sync_lead_nominal_deal_from_rab();

-- 3) Trigger di tabel rab_items: item RAB masih bisa diedit walau RAB-nya
--    sudah approved (cuma dikunci kalau sudah lunas -- lihat isLunas di
--    RabEditor.tsx), jadi perubahan qty/harga/tambah/hapus item juga perlu
--    ikut memicu recompute buat RAB yang approved.
create or replace function trg_sync_lead_nominal_deal_from_rab_item()
returns trigger
language plpgsql
as $$
declare
  v_lead_id uuid;
begin
  select r.lead_id into v_lead_id
  from rab_groups rg
  join rab r on r.id = rg.rab_id
  where rg.id = coalesce(new.group_id, old.group_id);

  if v_lead_id is not null then
    perform sync_lead_nominal_deal(v_lead_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

drop trigger if exists rab_items_sync_lead_nominal_deal on rab_items;
create trigger rab_items_sync_lead_nominal_deal
after insert or update or delete on rab_items
for each row execute function trg_sync_lead_nominal_deal_from_rab_item();

-- 4) Backfill: recompute nominal_deal buat semua lead yang sudah punya RAB
--    approved sekarang.
do $$
declare
  r record;
begin
  for r in select distinct lead_id from rab where status = 'approved' loop
    perform sync_lead_nominal_deal(r.lead_id);
  end loop;
end $$;
