-- Data manual menu Marketing, pengganti tab KPI Bulanan dan Eksperimen di
-- Mas BIG Tracking Marketing.xlsx. Funnel, Sumber Lead, dan omzet tidak
-- disimpan di sini karena dihitung langsung dari leads, rab, dan payments.
--
-- File ini idempotent -- aman dijalankan ulang.

create table if not exists marketing_kpi_monthly (
  -- Selalu tanggal 1 di bulan tersebut.
  bulan DATE primary key,
  review_google_total INT,
  budget_iklan NUMERIC(15, 2),
  updated_at TIMESTAMPTZ default now()
);

alter table marketing_kpi_monthly enable row level security;

drop policy if exists "Authenticated users full access to marketing_kpi_monthly" on marketing_kpi_monthly;
create policy "Authenticated users full access to marketing_kpi_monthly"
  on marketing_kpi_monthly for all
  to authenticated
  using (true)
  with check (true);

create table if not exists marketing_experiments (
  id UUID default gen_random_uuid() primary key,
  nama TEXT not null unique,
  hipotesis TEXT,
  cara_uji TEXT,
  metrik TEXT,
  baseline TEXT,
  hasil TEXT,
  mulai DATE,
  batas_evaluasi TEXT,
  status TEXT not null default 'Belum mulai' check (status in ('Belum mulai', 'Berjalan', 'Selesai')),
  keputusan TEXT,
  created_at TIMESTAMPTZ default now()
);

alter table marketing_experiments enable row level security;

drop policy if exists "Authenticated users full access to marketing_experiments" on marketing_experiments;
create policy "Authenticated users full access to marketing_experiments"
  on marketing_experiments for all
  to authenticated
  using (true)
  with check (true);

insert into marketing_experiments (nama, hipotesis, cara_uji, metrik, batas_evaluasi) values
  ('Perbaikan ke furniture', 'Klien perbaikan bisa jadi klien furniture', 'Tiap kunjungan perbaikan tawarkan cek ruangan lain gratis, catat yang lanjut order', 'Jumlah klien perbaikan yang order furniture dalam 3 bulan', '3 bulan atau 20 klien perbaikan'),
  ('Skrip WA baru', 'Kasih konteks sebelum angka mengurangi yang kabur setelah tanya harga', 'Pakai skrip WA dari dokumen acuan untuk semua chat tanya harga', 'Lead ke Survey (tab Funnel)', '2 bulan'),
  ('SPH 2 opsi + follow up', 'Opsi hemat dan follow up H+2, H+5 menyelamatkan yang mundur setelah SPH', 'Semua SPH kasih opsi standar dan hemat, follow up dicatat di log interaksi lead', 'SPH ke Deal Won (tab Funnel)', '2 bulan'),
  ('Iklan boost + retargeting', 'Iklan bukti lebih efektif dari iklan jualan', 'Boost konten Before After dan Kata Klien, retargeting engager IG, budget bulanan tetap', 'Biaya per Lead Iklan (tab KPI Bulanan)', '2 bulan')
on conflict (nama) do nothing;
