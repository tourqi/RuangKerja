-- Prioritas 3 audit: Auto-Eskalasi Lead Mati / Stale Lead Detection (rule #3).
--
-- Sebelumnya deteksi lead "mati" sepenuhnya manual/tidak ada -- satu-satunya
-- reminder yang ada (useNotifications.ts) cuma cek follow_up_date <= today,
-- dijalankan client-side saat user buka app (bukan scheduled job), jadi
-- lead yang macet tanpa follow_up_date terjadwal senyap dari radar.
--
-- Ini murni SQL + pg_cron -- BUKAN Supabase Edge Function terpisah. Lebih
-- simpel: tidak butuh deploy CLI, cukup di-apply seperti migration lainnya
-- (paste ke SQL Editor, run), plus satu langkah aktivasi jadwal di paling
-- bawah file ini.
--
-- Rule #3:
--   - Contacted tanpa update > 7 hari  -> auto-flag is_stale = true
--   - Survey tanpa follow up > 5 hari  -> notifikasi alert
--   - no_response_count >= 3           -> auto-transisi ke Deal Lost,
--                                          alasan_lost default
--
-- Catatan desain -- anchor waktu: "tanpa update"/"tanpa follow up" dianchor
-- ke coalesce(last_contacted_at, created_at), BUKAN updated_at. Kolom
-- updated_at di app ini cuma di-set sekali saat INSERT (tidak ada trigger
-- auto-bump saat UPDATE), jadi tidak reliable dipakai sebagai "kapan
-- terakhir ada aktivitas". last_contacted_at eksplisit diisi user tiap ada
-- kontak baru -- juga konsisten dengan rule #1 yang eksplisit menyebut SLA
-- Contacted "maks 3 hari dari last_contact".
--
-- Catatan desain -- target notifikasi: kalau lead.assigned_to terisi,
-- notifikasi cuma ke dia. Kalau kosong, fallback ke SEMUA user di auth.users
-- (bukan lewat tabel `profiles` + role='owner' seperti rencana awal --
-- ternyata tabel `profiles` tidak eksis sama sekali di database ini, jadi
-- tidak reliable dipakai buat filter role. `auth.users` dijamin selalu ada).
-- Semua 3 tipe eskalasi juga selalu ditulis ke activity_logs (bukan cuma
-- auto-lost) supaya tetap kelihatan di timeline lead walau notifikasi bell
-- gagal terkirim.
--
-- WAJIB dijalankan SETELAH lead_priority_formula.sql (butuh no_response_count
-- dan status Deal Won/Deal Lost).
--
-- File ini idempotent -- aman dijalankan ulang berkali-kali (semua
-- create-or-replace / if-not-exists / drop-if-exists).

alter table leads add column if not exists is_stale BOOLEAN not null default false;
-- Guard supaya alert Survey-overdue cuma di-log/notif SEKALI per periode
-- overdue, bukan tiap hari cron jalan selama lead itu masih nyangkut.
alter table leads add column if not exists survey_overdue_alerted BOOLEAN not null default false;

-- notifications.type perlu 3 tipe baru buat alert-alert ini.
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications
  add constraint notifications_type_check
  check (type in (
    'follow_up_due', 'project_overdue', 'invoice_overdue',
    'lead_stale', 'lead_survey_overdue', 'lead_auto_lost'
  ));

-- Helper: kirim notifikasi eskalasi ke assigned_to (atau fallback ke SEMUA
-- user di auth.users kalau lead tidak di-assign ke siapa pun). Dibungkus
-- EXCEPTION block sendiri (= implicit savepoint di plpgsql) supaya kalau ada
-- apa pun yang gagal di sini, itu TIDAK IKUT membatalkan perubahan
-- status/is_stale yang sudah dibuat caller di transaksi yang sama --
-- notifikasi gagal terkirim itu "nice to have", auto-lost/stale-flag yang
-- gagal ter-commit itu bug serius.
create or replace function notify_lead_escalation(
  p_lead_id uuid,
  p_assigned_to uuid,
  p_type text,
  p_title text,
  p_body text
) returns void
language plpgsql
security definer
as $$
declare
  target_id uuid;
begin
  if p_assigned_to is not null then
    insert into notifications (user_id, type, title, body, link, entity_id, read)
    values (p_assigned_to, p_type, p_title, p_body, '/leads/' || p_lead_id, p_lead_id, false)
    on conflict (user_id, type, entity_id) do nothing;
  else
    for target_id in select id from auth.users loop
      insert into notifications (user_id, type, title, body, link, entity_id, read)
      values (target_id, p_type, p_title, p_body, '/leads/' || p_lead_id, p_lead_id, false)
      on conflict (user_id, type, entity_id) do nothing;
    end loop;
  end if;
exception when others then
  raise warning 'notify_lead_escalation gagal untuk lead % (type=%): %', p_lead_id, p_type, sqlerrm;
end;
$$;

create or replace function run_lead_escalation()
returns void
language plpgsql
security definer
as $$
declare
  r record;
begin
  -- ===================================================================
  -- 1) Auto-lost: follow up >= 3x tanpa respon (berlaku dari status mana
  --    pun selain yang sudah final).
  -- ===================================================================
  for r in
    select id, assigned_to, project_name
    from leads
    where no_response_count >= 3
      and status not in ('Deal Won', 'Deal Lost')
  loop
    update leads
    set status = 'Deal Lost',
        alasan_lost = 'Auto-lost: no response after 3 follow-ups'
    where id = r.id;

    insert into activity_logs (entity_type, entity_id, user_name, action, description)
    values ('lead', r.id, 'System (auto-eskalasi)', 'status_changed',
            'Status otomatis diubah menjadi Deal Lost: no response after 3 follow-ups');

    perform notify_lead_escalation(
      r.id, r.assigned_to, 'lead_auto_lost',
      'Lead auto-lost: ' || coalesce(r.project_name, 'tanpa nama project'),
      'Tidak ada respon setelah 3x follow-up, status otomatis jadi Deal Lost.'
    );
  end loop;

  -- ===================================================================
  -- 2) Stale flag: Contacted tanpa kontak terbaru > 7 hari
  -- ===================================================================
  for r in
    select id, assigned_to, project_name
    from leads
    where status = 'Contacted'
      and is_stale = false
      and coalesce(last_contacted_at, created_at) < now() - interval '7 days'
  loop
    update leads set is_stale = true where id = r.id;

    insert into activity_logs (entity_type, entity_id, user_name, action, description)
    values ('lead', r.id, 'System (auto-eskalasi)', 'flagged_stale',
            'Auto-flag: status Contacted lebih dari 7 hari tanpa kontak terbaru.');

    perform notify_lead_escalation(
      r.id, r.assigned_to, 'lead_stale',
      'Lead stale: ' || coalesce(r.project_name, 'tanpa nama project'),
      'Status Contacted lebih dari 7 hari tanpa kontak terbaru.'
    );
  end loop;

  -- un-flag lead yang sudah tidak stale lagi (ada kontak baru, atau status
  -- sudah pindah dari Contacted ke tahap lain).
  update leads
  set is_stale = false
  where is_stale = true
    and (status <> 'Contacted' or coalesce(last_contacted_at, created_at) >= now() - interval '7 days');

  -- ===================================================================
  -- 3) Alert: Survey tanpa follow up > 5 hari (sekali per periode overdue --
  --    lihat survey_overdue_alerted)
  -- ===================================================================
  for r in
    select id, assigned_to, project_name
    from leads
    where status = 'Survey'
      and survey_overdue_alerted = false
      and coalesce(last_contacted_at, created_at) < now() - interval '5 days'
  loop
    update leads set survey_overdue_alerted = true where id = r.id;

    insert into activity_logs (entity_type, entity_id, user_name, action, description)
    values ('lead', r.id, 'System (auto-eskalasi)', 'survey_overdue_alert',
            'Alert: status Survey lebih dari 5 hari tanpa follow up.');

    perform notify_lead_escalation(
      r.id, r.assigned_to, 'lead_survey_overdue',
      'Survey overdue: ' || coalesce(r.project_name, 'tanpa nama project'),
      'Status Survey lebih dari 5 hari tanpa follow up.'
    );
  end loop;

  -- reset flag begitu tidak lagi overdue (ada kontak baru, atau sudah pindah
  -- dari Survey ke tahap lain) supaya siklus berikutnya bisa alert lagi.
  update leads
  set survey_overdue_alerted = false
  where survey_overdue_alerted = true
    and (status <> 'Survey' or coalesce(last_contacted_at, created_at) >= now() - interval '5 days');
end;
$$;

-- =====================================================================
-- Aktivasi jadwal harian lewat pg_cron.
--
-- Kalau `create extension` di bawah gagal karena permission, aktifkan
-- pg_cron lewat Dashboard -> Database -> Extensions -> cari "pg_cron" ->
-- Enable, baru jalankan blok `select cron.schedule(...)` di bawah manual.
-- =====================================================================

create extension if not exists pg_cron;

-- Jalan tiap hari jam 01:00 UTC (~08:00 WIB). Memanggil ulang cron.schedule()
-- dengan nama job yang sama akan meng-update jadwalnya (pg_cron versi baru);
-- kalau errornya "job already exists", jalankan dulu:
--   select cron.unschedule('lead-auto-escalation-daily');
-- baru select cron.schedule(...) lagi.
select cron.schedule(
  'lead-auto-escalation-daily',
  '0 1 * * *',
  $$ select run_lead_escalation(); $$
);

-- Jalankan sekali manual sekarang juga supaya lead yang sudah lama nyangkut
-- langsung ke-flag/ke-notif, tidak perlu nunggu jadwal besok.
select run_lead_escalation();
