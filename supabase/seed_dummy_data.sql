-- =============================================================================
-- seed_dummy_data.sql — RuangKerja demo/dummy data
--
-- Run AFTER the schema exists (supabase/migrations/0000_init_schema.sql +
-- the rest of supabase/migrations/, already applied on this project).
--
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- Every insert uses a fixed UUID and `ON CONFLICT ... DO NOTHING`, so
-- re-running the script is safe and won't create duplicates.
--
-- Demo login (created in STEP 1 below):
--   owner@ruangkerja.demo    / Demo12345!   (role: owner)
--   designer@ruangkerja.demo / Demo12345!   (role: designer)
--   sales@ruangkerja.demo    / Demo12345!   (role: sales)
--
-- NOTE on STEP 1: it inserts directly into auth.users, which is the usual
-- trick for seeding demo logins from SQL. Supabase's SQL Editor runs as the
-- postgres role so this normally works, but some hosted projects restrict
-- writes to the auth schema. If STEP 1 errors out, create the 3 users from
-- Dashboard -> Authentication -> Add user instead (same emails), then just
-- run STEP 2 onwards — the profile inserts use the same fixed UUIDs, so
-- swap in the real generated auth.users ids there if you go that route.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- STEP 1: demo auth users + profiles
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'owner@ruangkerja.demo', crypt('Demo12345!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Andi Nugroho","role":"owner"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'designer@ruangkerja.demo', crypt('Demo12345!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Sarah Amelia","role":"designer"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'sales@ruangkerja.demo', crypt('Demo12345!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Rizky Pratama","role":"sales"}',
   now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into profiles (id, name, role, email, created_at) values
  ('a0000000-0000-0000-0000-000000000001', 'Andi Nugroho',  'owner',    'owner@ruangkerja.demo',    now()),
  ('a0000000-0000-0000-0000-000000000002', 'Sarah Amelia',  'designer', 'designer@ruangkerja.demo', now()),
  ('a0000000-0000-0000-0000-000000000003', 'Rizky Pratama', 'sales',    'sales@ruangkerja.demo',    now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 2: clients
-- ---------------------------------------------------------------------------
insert into clients (id, name, phone, address, notes, project_name, property_type, budget_range, lead_status, source, priority) values
  ('c1000000-0000-0000-0000-000000000001', 'Budi Santoso',    '0812-3456-7001', 'Jl. Kemang Raya No. 12, Jakarta Selatan',        'Referral dari klien lama',       'Renovasi Rumah Kemang',        'Rumah Tinggal', '100jt - 200jt', 'Deal Won',   'Referral',      'high'),
  ('c1000000-0000-0000-0000-000000000002', 'Siti Rahma',      '0813-2345-6002', 'Apartemen Taman Anggrek Tower B, Jakarta Barat', 'Ingin desain minimalis',         'Interior Apartemen 2BR',       'Apartemen',      '50jt - 100jt',  'Survey',     'Instagram Ads', 'medium'),
  ('c1000000-0000-0000-0000-000000000003', 'Andi Wijaya',     '0812-9988-1003', 'Jl. Sudirman Kav 45, Jakarta Pusat',              'Butuh desain kantor cepat',      'Fit Out Kantor Startup',       'Kantor',         '200jt - 500jt', 'New Lead',   'Website',       'urgent'),
  ('c1000000-0000-0000-0000-000000000004', 'Dewi Lestari',    '0857-1122-3004', 'Perumahan Grand Wisata, Bekasi',                  null,                              'Renovasi Dapur & Ruang Keluarga','Rumah Tinggal', '50jt - 100jt',  'Contacted',  'Facebook',      'low'),
  ('c1000000-0000-0000-0000-000000000005', 'Rudi Hartono',    '0811-4455-6005', 'Jl. Panjang No. 8, Jakarta Barat',                'Pemilik ruko 3 lantai',           'Interior Ruko Komersial',      'Ruko',           '100jt - 200jt', 'Deal Won',   'Referral',      'medium'),
  ('c1000000-0000-0000-0000-000000000006', 'Maya Kusuma',     '0812-7788-9006', 'Apartemen Casa Grande, Jakarta Selatan',          'Deadline pindahan bulan depan',  'Interior Apartemen Studio',    'Apartemen',      '< 50jt',        'Deal Lost',  'Instagram Ads', 'low'),
  ('c1000000-0000-0000-0000-000000000007', 'Eko Prasetyo',    '0813-6677-8007', 'Jl. Margonda Raya, Depok',                        null,                              'Renovasi Total Rumah 2 Lantai','Rumah Tinggal',  '200jt - 500jt', 'Survey',     'Website',       'high'),
  ('c1000000-0000-0000-0000-000000000008', 'Fitri Handayani', '0821-3344-5008', 'Jl. Riau No. 20, Bandung',                        'Cafe konsep industrial',         'Interior Cafe & Resto',        'Komersial',      '100jt - 200jt', 'Deal Won',   'Referral',      'high')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 3: leads (one per client above)
--
-- lokasi_survey/budget/nominal_deal/alasan_lost diisi sesuai syarat guard
-- transisi status di lead_state_machine.sql (status di sini adalah status
-- akhir hasil INSERT langsung, jadi guard -- yang cuma jalan di UPDATE --
-- tidak berlaku buat baris seed ini, tapi datanya tetap diisi realistis).
--
-- Kolom `priority` di insert ini cuma placeholder -- kalau
-- lead_priority_formula.sql sudah dijalankan, trigger set_lead_priority()
-- akan langsung menimpanya dengan hasil hitungan otomatis (rule #2), jadi
-- nilai yang ditulis di sini tidak berarti apa-apa lagi setelah insert.
-- ---------------------------------------------------------------------------
insert into leads (id, client_id, status, priority, source, project_name, follow_up_date, last_contacted_at, closed_at, notes, stage_order, assigned_to, created_by, created_at, lokasi_survey, budget, nominal_deal, alasan_lost) values
  ('1e000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Deal Won',  'high',   'Referral',      'Renovasi Rumah Kemang',         '2026-08-20', '2026-08-10', '2026-08-12', null,                 4, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '2026-07-01', 'Jl. Kemang Raya No. 12, Jakarta Selatan',        190000000, 180000000, null),
  ('1e000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Survey',    'medium', 'Instagram Ads', 'Interior Apartemen 2BR',        '2026-08-18', '2026-08-14', null,         null,                 2, 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', '2026-08-01', 'Apartemen Taman Anggrek Tower B, Jakarta Barat', null,      null,      null),
  ('1e000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'New Lead',  'urgent', 'Website',       'Fit Out Kantor Startup',        '2026-08-17', null,         null,         null,                 0, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '2026-08-14', null,                                              null,      null,      null),
  ('1e000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Contacted', 'low',    'Facebook',      'Renovasi Dapur & Ruang Keluarga','2026-08-19', '2026-08-15', null,         null,                 1, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '2026-08-10', null,                                              null,      null,      null),
  ('1e000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 'Deal Won',  'medium', 'Referral',      'Interior Ruko Komersial',       null,         '2026-08-01', '2026-08-05', null,                 4, 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', '2026-07-15', 'Jl. Panjang No. 8, Jakarta Barat',               160000000, 150000000, null),
  ('1e000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 'Deal Lost', 'low',    'Instagram Ads', 'Interior Apartemen Studio',     null,         '2026-07-18', '2026-07-20', 'Budget tidak cukup', 4, 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '2026-07-10', 'Apartemen Casa Grande, Jakarta Selatan',         null,      null,      'Budget client tidak cukup untuk scope yang diminta'),
  ('1e000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 'Survey',    'high',   'Website',       'Renovasi Total Rumah 2 Lantai',  '2026-08-21', '2026-08-13', null,         null,                 2, 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', '2026-08-05', 'Jl. Margonda Raya, Depok',                        null,      null,      null),
  ('1e000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 'Deal Won',  'high',   'Referral',      'Interior Cafe & Resto',         null,         '2026-07-28', '2026-08-01', null,                 4, 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', '2026-06-20', 'Jl. Riau No. 20, Bandung',                        185000000, 175000000, null)
on conflict (id) do nothing;

-- Log kontak minimum (syarat New Lead -> Contacted) untuk lead yang sudah
-- lewat tahap New Lead.
insert into lead_contacts (lead_id, channel, notes, created_by, created_at) values
  ('1e000000-0000-0000-0000-000000000001', 'call',      'Kontak awal, client tertarik renovasi total', 'a0000000-0000-0000-0000-000000000003', '2026-07-02'),
  ('1e000000-0000-0000-0000-000000000002', 'whatsapp',  'Follow up dari Instagram Ads',                 'a0000000-0000-0000-0000-000000000003', '2026-08-02'),
  ('1e000000-0000-0000-0000-000000000004', 'whatsapp',  'Balas chat dari Facebook Ads',                 'a0000000-0000-0000-0000-000000000003', '2026-08-11'),
  ('1e000000-0000-0000-0000-000000000005', 'call',      'Diskusi kebutuhan interior ruko',              'a0000000-0000-0000-0000-000000000003', '2026-07-16'),
  ('1e000000-0000-0000-0000-000000000006', 'whatsapp',  'Tanya-tanya paket interior studio',            'a0000000-0000-0000-0000-000000000003', '2026-07-11'),
  ('1e000000-0000-0000-0000-000000000007', 'call',      'Kontak awal dari Website',                      'a0000000-0000-0000-0000-000000000003', '2026-08-06'),
  ('1e000000-0000-0000-0000-000000000008', 'meeting',   'Meeting awal bahas konsep cafe',                'a0000000-0000-0000-0000-000000000003', '2026-06-21')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 4: projects
-- ---------------------------------------------------------------------------
insert into projects (id, client_id, lead_id, name, value, status, start_date, deadline, assigned_to, progress, created_at) values
  ('90000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'Renovasi Rumah Kemang - Budi Santoso',    180000000, 'Production',   '2026-07-01', '2026-09-15', 'a0000000-0000-0000-0000-000000000002', 60,  '2026-07-01'),
  ('90000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000005', '1e000000-0000-0000-0000-000000000005', 'Interior Ruko Komersial - Rudi Hartono',  150000000, 'Design',       '2026-08-05', '2026-10-01', 'a0000000-0000-0000-0000-000000000002', 25,  '2026-08-05'),
  ('90000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000008', '1e000000-0000-0000-0000-000000000008', 'Interior Cafe & Resto - Fitri Handayani', 175000000, 'Installation', '2026-06-15', '2026-08-25', 'a0000000-0000-0000-0000-000000000002', 85,  '2026-06-15'),
  ('90000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', null,                                     'Interior Apartemen Studio - Proyek Sebelumnya', 45000000, 'Done',   '2026-04-01', '2026-05-15', 'a0000000-0000-0000-0000-000000000002', 100, '2026-04-01'),
  ('90000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000007', '1e000000-0000-0000-0000-000000000007', 'Renovasi Total Rumah 2 Lantai - Eko Prasetyo', 300000000, 'Planning', '2026-08-16', '2026-12-01', 'a0000000-0000-0000-0000-000000000002', 5,   '2026-08-16')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 5: RAB (rab / rab_groups / rab_items)
-- ---------------------------------------------------------------------------
insert into rab (id, lead_id, nama, status, diskon_persen, diskon_nilai, skema_pembayaran, created_at, updated_at) values
  ('ab000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', 'RAB Renovasi Rumah Kemang',      'approved', 5,  2640000, '[{"persen":50,"keterangan":"DP setelah RAB disetujui"},{"persen":30,"keterangan":"Termin 2 - mulai produksi"},{"persen":20,"keterangan":"Pelunasan sebelum instalasi"}]'::jsonb, '2026-07-05', '2026-07-10'),
  ('ab000000-0000-0000-0000-000000000002', '1e000000-0000-0000-0000-000000000005', 'RAB Interior Ruko Komersial',    'sent',     0,  0,       '[{"persen":40,"keterangan":"DP"},{"persen":60,"keterangan":"Pelunasan"}]'::jsonb, '2026-08-06', '2026-08-06'),
  ('ab000000-0000-0000-0000-000000000003', '1e000000-0000-0000-0000-000000000008', 'RAB Interior Cafe & Resto',      'approved', 10, 5960000, '[{"persen":50,"keterangan":"DP"},{"persen":50,"keterangan":"Pelunasan sebelum buka"}]'::jsonb, '2026-06-18', '2026-06-22'),
  ('ab000000-0000-0000-0000-000000000004', '1e000000-0000-0000-0000-000000000002', 'RAB Interior Apartemen 2BR (Draft)', 'draft', 0, 0,      null, '2026-08-14', '2026-08-14')
on conflict (id) do nothing;

insert into rab_groups (id, rab_id, no, deskripsi, created_at) values
  ('bb000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 1, 'Ruang Tamu',            '2026-07-05'),
  ('bb000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000001', 2, 'Dapur',                 '2026-07-05'),
  ('bb000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000002', 1, 'Lantai 1 - Area Display','2026-08-06'),
  ('bb000000-0000-0000-0000-000000000004', 'ab000000-0000-0000-0000-000000000002', 2, 'Lantai 2 - Ruang Kerja', '2026-08-06'),
  ('bb000000-0000-0000-0000-000000000005', 'ab000000-0000-0000-0000-000000000003', 1, 'Area Makan Indoor',     '2026-06-18'),
  ('bb000000-0000-0000-0000-000000000006', 'ab000000-0000-0000-0000-000000000003', 2, 'Dapur & Bar',           '2026-06-18'),
  ('bb000000-0000-0000-0000-000000000007', 'ab000000-0000-0000-0000-000000000004', 1, 'Kamar Tidur Utama',     '2026-08-14')
on conflict (id) do nothing;

insert into rab_items (group_id, spesifikasi, qty, unit, harga, sort_order, dimensi_p, dimensi_l) values
  ('bb000000-0000-0000-0000-000000000001', 'Sofa custom 3 seater',        2, 'unit',        8500000, 1, 220, 90),
  ('bb000000-0000-0000-0000-000000000001', 'Meja kopi kayu jati',         1, 'unit',        3200000, 2, null, null),
  ('bb000000-0000-0000-0000-000000000001', 'Karpet bulu premium',         1, 'unit',        1800000, 3, null, null),
  ('bb000000-0000-0000-0000-000000000002', 'Kitchen set custom HPL',      6, 'meter lari',  4500000, 1, 600, 60),
  ('bb000000-0000-0000-0000-000000000002', 'Backsplash granit',           4, 'meter',        950000, 2, null, null),
  ('bb000000-0000-0000-0000-000000000003', 'Rak display custom',          8, 'unit',        2100000, 1, null, null),
  ('bb000000-0000-0000-0000-000000000003', 'Lighting track system',      12, 'titik',        450000, 2, null, null),
  ('bb000000-0000-0000-0000-000000000004', 'Partisi kaca frameless',     10, 'meter',       1200000, 1, null, null),
  ('bb000000-0000-0000-0000-000000000004', 'Meja kerja modular',          6, 'unit',        2800000, 2, null, null),
  ('bb000000-0000-0000-0000-000000000005', 'Meja cafe kayu solid',       10, 'unit',        1500000, 1, null, null),
  ('bb000000-0000-0000-0000-000000000005', 'Kursi cafe besi hollow',     40, 'unit',         650000, 2, null, null),
  ('bb000000-0000-0000-0000-000000000006', 'Bar counter custom',          1, 'unit',       12000000, 1, 400, 60),
  ('bb000000-0000-0000-0000-000000000006', 'Rak bahan stainless',         3, 'unit',        2200000, 2, null, null),
  ('bb000000-0000-0000-0000-000000000007', 'Wardrobe custom 3 pintu',     1, 'unit',        6500000, 1, 240, 60),
  ('bb000000-0000-0000-0000-000000000007', 'Nakas minimalis',             2, 'unit',         950000, 2, null, null)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 6: invoices + payments
-- ---------------------------------------------------------------------------
insert into invoices (id, client_id, lead_id, project_id, rab_id, invoice_number, total_amount, paid_amount, status, invoice_date, due_date, notes, diskon_persen, diskon_nilai, created_by, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'INV-202608-001', 90000000,  90000000, 'paid',    '2026-08-01', '2026-08-01', 'DP 50% - Renovasi Rumah Kemang',       0, 0, 'a0000000-0000-0000-0000-000000000003', '2026-08-01'),
  ('10000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', '1e000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'ab000000-0000-0000-0000-000000000001', 'INV-202608-002', 54000000,  20000000, 'partial', '2026-08-14', '2026-08-28', 'Termin 2 - mulai produksi',             0, 0, 'a0000000-0000-0000-0000-000000000003', '2026-08-14'),
  ('10000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000008', '1e000000-0000-0000-0000-000000000008', '90000000-0000-0000-0000-000000000003', 'ab000000-0000-0000-0000-000000000003', 'INV-202606-001', 157500000, 157500000,'paid',    '2026-06-20', '2026-07-04', 'Pelunasan Interior Cafe & Resto',       0, 0, 'a0000000-0000-0000-0000-000000000003', '2026-06-20'),
  ('10000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', null,                                     '90000000-0000-0000-0000-000000000004', null,                                     'INV-202604-001', 45000000,  45000000, 'paid',    '2026-04-05', '2026-04-19', 'Pelunasan proyek sebelumnya',           0, 0, 'a0000000-0000-0000-0000-000000000003', '2026-04-05'),
  ('10000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', '1e000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000002', 'ab000000-0000-0000-0000-000000000002', 'INV-202608-003', 40000000,  0,        'overdue', '2026-07-20', '2026-08-03', 'DP 40% - Interior Ruko Komersial',      0, 0, 'a0000000-0000-0000-0000-000000000003', '2026-07-20')
on conflict (id) do nothing;

insert into payments (invoice_id, amount, payment_date, payment_method, notes) values
  ('10000000-0000-0000-0000-000000000001', 90000000,  '2026-08-01', 'transfer', 'DP diterima full via transfer BCA'),
  ('10000000-0000-0000-0000-000000000002', 20000000,  '2026-08-15', 'transfer', 'Pembayaran cicilan pertama termin 2'),
  ('10000000-0000-0000-0000-000000000003', 157500000, '2026-06-25', 'transfer', 'Pelunasan diterima'),
  ('10000000-0000-0000-0000-000000000004', 45000000,  '2026-04-10', 'transfer', 'Pelunasan proyek apartemen studio')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 7: project_expenses
-- ---------------------------------------------------------------------------
insert into project_expenses (project_id, tanggal, deskripsi, kategori, jumlah, vendor, notes) values
  ('90000000-0000-0000-0000-000000000001', '2026-07-05', 'Pembelian kayu jati',                    'material',  12000000, 'Toko Kayu Jaya',        null),
  ('90000000-0000-0000-0000-000000000001', '2026-07-20', 'Ongkos tukang finishing',                'jasa',       8000000, 'CV Mitra Finishing',    null),
  ('90000000-0000-0000-0000-000000000001', '2026-08-02', 'Transport pengiriman furniture',         'transport',  1500000, null,                    null),
  ('90000000-0000-0000-0000-000000000003', '2026-06-01', 'Pembelian stainless steel bar counter',  'material',   9000000, 'Sumber Logam',          null),
  ('90000000-0000-0000-0000-000000000003', '2026-07-10', 'Jasa tukang las & instalasi bar',        'jasa',       5000000, 'Bengkel Las Makmur',    null),
  ('90000000-0000-0000-0000-000000000004', '2026-04-20', 'Cat dinding & finishing akhir',          'material',   3000000, 'Toko Cat Sentosa',      null)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 8: general_expenses (biaya operasional kantor, di luar proyek)
-- ---------------------------------------------------------------------------
insert into general_expenses (id, tanggal, deskripsi, kategori, sub_kategori, jumlah, vendor, notes, created_by) values
  ('ee000000-0000-0000-0000-000000000001', '2026-08-01', 'Sewa kantor bulan Agustus',                       'operasional', 'Sewa',        15000000, 'PT Properti Sentosa',    null, 'a0000000-0000-0000-0000-000000000001'),
  ('ee000000-0000-0000-0000-000000000002', '2026-08-05', 'Iklan Instagram & Google Ads',                    'marketing',   'Digital Ads',  5000000, 'Meta Ads',               null, 'a0000000-0000-0000-0000-000000000001'),
  ('ee000000-0000-0000-0000-000000000003', '2026-08-01', 'Gaji karyawan bulan Agustus',                     'gaji',        null,          35000000, null,                     null, 'a0000000-0000-0000-0000-000000000001'),
  ('ee000000-0000-0000-0000-000000000004', '2026-07-15', 'Langganan software desain (SketchUp, AutoCAD)',   'operasional', 'Software',     2500000, 'Trimble Inc',            null, 'a0000000-0000-0000-0000-000000000002'),
  ('ee000000-0000-0000-0000-000000000005', '2026-08-10', 'Cetak brosur & katalog produk',                   'marketing',   'Cetak',        1800000, 'Percetakan Media Grafika', null, 'a0000000-0000-0000-0000-000000000003'),
  ('ee000000-0000-0000-0000-000000000006', '2026-07-28', 'Servis kendaraan operasional',                    'lainnya',     null,            900000, 'Bengkel Auto Care',      null, 'a0000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- STEP 9: activity_logs
-- ---------------------------------------------------------------------------
insert into activity_logs (entity_type, entity_id, user_id, user_name, action, description, created_at) values
  ('lead',            '1e000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Rizky Pratama', 'created',        'Lead baru dibuat: Renovasi Rumah Kemang',                 '2026-07-01'),
  ('lead',             '1e000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Rizky Pratama', 'status_changed', 'Status diubah menjadi Deal Won',                          '2026-08-12'),
  ('rab',              'ab000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Sarah Amelia',  'created',        'RAB baru dibuat: RAB Renovasi Rumah Kemang',              '2026-07-05'),
  ('rab',              'ab000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Andi Nugroho',  'status_changed', 'Status RAB diubah menjadi approved',                      '2026-07-10'),
  ('project',          '90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Rizky Pratama', 'created',        'Project baru dibuat: Renovasi Rumah Kemang - Budi Santoso','2026-07-01'),
  ('invoice',          '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Rizky Pratama', 'created',        'Invoice INV-202608-001 dibuat',                           '2026-08-01'),
  ('invoice',          '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Andi Nugroho',  'payment_added',  'Pembayaran Rp90.000.000 diterima',                        '2026-08-01'),
  ('expense',          '90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Sarah Amelia',  'created',        'Pengeluaran ditambahkan: Pembelian kayu jati (Rp12.000.000)', '2026-07-05'),
  ('general_expense',  'ee000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Andi Nugroho',  'created',        'Pengeluaran umum ditambahkan: Sewa kantor bulan Agustus (Rp15.000.000)', '2026-08-01'),
  ('lead',             '1e000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Rizky Pratama', 'status_changed', 'Status diubah menjadi Deal Lost',                         '2026-07-20')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- STEP 10: notifications
-- ---------------------------------------------------------------------------
insert into notifications (user_id, type, title, body, link, entity_id, read, created_at) values
  ('a0000000-0000-0000-0000-000000000001', 'follow_up_due',   'Follow up lead: Andi Wijaya',        'Jadwal follow up hari ini',                        '/leads',     '1e000000-0000-0000-0000-000000000003', false, '2026-08-16'),
  ('a0000000-0000-0000-0000-000000000001', 'project_overdue', 'Project mendekati deadline',          'Interior Cafe & Resto - deadline 25 Agustus',      '/projects',  '90000000-0000-0000-0000-000000000003', false, '2026-08-15'),
  ('a0000000-0000-0000-0000-000000000001', 'invoice_overdue', 'Invoice jatuh tempo',                 'INV-202608-003 sudah lewat jatuh tempo',           '/invoices',  '10000000-0000-0000-0000-000000000005', false, '2026-08-14'),
  ('a0000000-0000-0000-0000-000000000002', 'follow_up_due',   'Follow up lead: Siti Rahma',           'Survey dijadwalkan',                               '/leads',     '1e000000-0000-0000-0000-000000000002', true,  '2026-08-13'),
  ('a0000000-0000-0000-0000-000000000003', 'follow_up_due',   'Follow up lead: Dewi Lestari',         null,                                                '/leads',     '1e000000-0000-0000-0000-000000000004', false, '2026-08-15')
on conflict (user_id, type, entity_id) do nothing;

commit;
