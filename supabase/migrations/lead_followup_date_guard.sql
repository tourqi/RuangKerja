-- Prioritas 4 audit: Follow Up Date Wajib per Status (rule #1).
--
-- Sebelumnya follow_up_date adalah input tanggal bebas tanpa validasi apa
-- pun -- status lead bisa dipindah ke Contacted/Survey/Deal tanpa
-- follow_up_date terisi, sehingga lead bisa "senyap" tanpa jadwal follow-up
-- dan tidak terdeteksi.
--
-- Migration ini menambah pengecekan follow_up_date ke fungsi guard yang
-- sudah ada (guard_lead_status_transition(), dibuat di
-- lead_state_machine.sql) -- cukup create-or-replace, trigger yang sudah
-- terpasang otomatis ikut pakai logika baru ini, tidak perlu drop/recreate
-- trigger.
--
-- Catatan scope: SLA "maks N hari" di rule #1 (mis. "maks 3 hari dari
-- last_contact") BUKAN validasi save/block di sini -- itu domain
-- auto-eskalasi/monitoring stale lead (Prioritas 3), beda mekanisme dari
-- guard synchronous ini. Yang divalidasi di sini murni "wajib terisi" per
-- status, sesuai lingkup prioritas 4.
--
-- WAJIB dijalankan SETELAH lead_state_machine.sql (fungsi ini meng-override
-- definisi guard_lead_status_transition() yang dibuat di sana).

create or replace function guard_lead_status_transition()
returns trigger
language plpgsql
as $$
begin
  -- hanya berlaku saat status benar-benar berubah
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- rule #1: follow_up_date wajib untuk Contacted/Survey/Deal. Deal Won
  -- (transaksi selesai) dan Deal Lost (opsional, re-engagement) tidak wajib.
  if new.status in ('Contacted', 'Survey', 'Deal') and new.follow_up_date is null then
    raise exception 'Tidak bisa pindah ke status %: Follow Up Date wajib diisi.', new.status;
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
