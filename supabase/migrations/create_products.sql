-- Katalog produk & layanan Mas BIG, dipakai untuk pengkategorian lead: produk
-- apa yang paling sering diminati dan dibeli. Harga di sini hanya referensi
-- dan sengaja tidak terhubung ke RAB.
--
-- Isi awal 23 produk dari sheet "Produk" di Mas_BIG_Product_Brainstorm.xlsx.
--
-- File ini idempotent -- aman dijalankan ulang (if-not-exists / drop-if-exists,
-- seed memakai on conflict do nothing supaya editan di aplikasi tidak tertimpa).

create table if not exists products (
  id UUID default gen_random_uuid() primary key,
  kode TEXT not null unique,
  nama TEXT not null,
  lini TEXT,
  kategori TEXT not null,
  deskripsi TEXT,
  deliverable TEXT,
  sudah_termasuk TEXT,
  tidak_termasuk TEXT,
  satuan TEXT,
  harga_mulai NUMERIC(15, 2),
  harga_sampai NUMERIC(15, 2),
  estimasi_durasi TEXT,
  segmen TEXT,
  tangga TEXT check (tangga in ('Entry', 'Core', 'Upsell', 'Retensi')),
  status TEXT not null default 'Draft' check (status in ('Draft', 'Perlu validasi', 'Final', 'Ditunda')),
  catatan TEXT,
  prioritas TEXT check (prioritas in ('Utama', 'Pendukung', 'Ditunda')),
  aktif BOOLEAN not null default true,
  created_at TIMESTAMPTZ default now()
);

create index if not exists idx_products_kategori on products(kategori);

alter table products enable row level security;

drop policy if exists "Authenticated users full access to products" on products;
create policy "Authenticated users full access to products"
  on products for all
  to authenticated
  using (true)
  with check (true);

-- Satu lead bisa punya banyak produk. dibeli = false berarti baru diminati.
-- product_id RESTRICT: produk yang sudah pernah dipakai cukup dinonaktifkan,
-- supaya riwayat laporan tidak hilang.
create table if not exists lead_products (
  lead_id UUID not null references leads(id) on delete cascade,
  product_id UUID not null references products(id) on delete restrict,
  dibeli BOOLEAN not null default false,
  created_at TIMESTAMPTZ default now(),
  primary key (lead_id, product_id)
);

create index if not exists idx_lead_products_product_id on lead_products(product_id);

alter table lead_products enable row level security;

drop policy if exists "Authenticated users full access to lead_products" on lead_products;
create policy "Authenticated users full access to lead_products"
  on lead_products for all
  to authenticated
  using (true)
  with check (true);

-- Saat lead menjadi Deal Won, semua produk yang diminati dianggap dibeli
-- kecuali user sudah menandai sebagian. Koreksinya ada di detail lead.
create or replace function mark_lead_products_bought()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Deal Won' and new.status is distinct from old.status
     and not exists (select 1 from lead_products where lead_id = new.id and dibeli) then
    update lead_products set dibeli = true where lead_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_mark_products_bought on leads;
create trigger leads_mark_products_bought
after update on leads
for each row execute function mark_lead_products_bought();

insert into products (
  kode, nama, lini, kategori, deskripsi, deliverable, sudah_termasuk, tidak_termasuk,
  satuan, harga_mulai, harga_sampai, estimasi_durasi, segmen, tangga, status, catatan, prioritas
) values
  ('DS01', 'Desain 3D Interior', 'Desain Studio', 'Desain', 'Produk ini bertujuan untuk membuat desain interior maupun sipil dalam bentuk visual 3D, supaya customer bisa melihat hasil akhir ruangan sebelum produksi dimulai. Aplikasi yang digunakan SketchUp, AutoCAD dsb.', 'Desain 3D, render image 3 sampai 5 sudut per ruangan, RAB', 'Survey lokasi gratis, 2 kali revisi. Gratis kalau lanjut produksi di Mas BIG', 'Revisi tambahan, gambar kerja (DS02)', 'per ruangan', 500000, 1000000, 'Sekitar 2 minggu', 'Semua Segmen', 'Entry', 'Perlu validasi', 'Sesuai Price List Mei 2026: Desain 3D + RAB, gratis untuk minimal order tertentu. Minimal order berapa?', 'Utama'),
  ('DS02', 'Gambar Kerja', 'Desain Studio', 'Desain', 'Produk ini bertujuan untuk membuat gambar teknis yang jadi acuan tim produksi dan tukang di lapangan, berisi ukuran, potongan dan detail material, supaya hasil pengerjaan presisi sesuai desain.', 'Gambar kerja (denah, tampak, potongan, detail ukuran dan material) dalam file PDF', 'Gratis kalau lanjut produksi di Mas BIG', 'Revisi setelah gambar disetujui', 'per m²', 50000, 100000, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Harga masih rekomendasi, perlu disetujui owner. Dijual ke klien yang mau eksekusi sendiri atau pakai kontraktor lain', 'Pendukung'),
  ('CF01', 'Kitchen Set', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk membantu menata area dapur, dari segi fungsional, estetika dan kenyamanan selama beraktivitas di dapur.', 'Kitchen set custom terpasang sesuai desain 3D. Komponen menyesuaikan pesanan: kabinet atas, kabinet bawah, top table, backsplash, rak', 'Rak piring, rak bumbu, desain 3D, garansi 3 bulan (material, pekerjaan, finishing), engsel dan rel laci garansi 1 tahun, pengiriman Jabodetabek', 'Pekerjaan sipil dan finishing (coran, dinding, keramik, instalasi) masuk produk Sipil & Renovasi, dihitung terpisah', 'per m²', 1950000, 3900000, 'Sekitar 2 minggu dari mulai produksi', 'Semua Segmen', 'Core', 'Perlu validasi', 'Sesuai Price List Mei 2026: mulai Blockboard HPL, paling tinggi PVC Board Duco. Bisa juga untuk pantry kantor dan bar counter cafe', 'Utama'),
  ('CF02', 'Wardrobe / Lemari Pakaian', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk membantu menata area kamar dengan ruang penyimpanan yang lebih luas, praktis namun tetap estetik sesuai dengan selera pengguna.', 'Wardrobe custom terpasang sesuai desain 3D yang disetujui', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), engsel dan rel laci garansi 1 tahun, pengiriman Jabodetabek', 'Pekerjaan sipil dan finishing (coran, dinding, keramik, instalasi) masuk produk Sipil & Renovasi, dihitung terpisah', 'per m²', 1850000, 2800000, 'Sekitar 2 minggu dari mulai produksi', 'Homeowners', 'Core', 'Perlu validasi', 'Sesuai Price List Mei 2026: mulai Blockboard HPL, paling tinggi Plywood Duco', 'Utama'),
  ('CF03', 'Backdrop TV', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk menata ulang area ruang TV supaya lebih indah, namun tetap memiliki fungsionalitas yang maksimal.', 'Backdrop TV custom terpasang sesuai desain 3D. Komponen menyesuaikan pesanan: panel backdrop, kabinet atau rak TV', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), pengiriman Jabodetabek', 'Pekerjaan sipil dan finishing (coran, dinding, keramik, instalasi) masuk produk Sipil & Renovasi, dihitung terpisah', 'per m²', 1300000, 1800000, 'Sekitar 2 minggu dari mulai produksi', 'Homeowners', 'Upsell', 'Perlu validasi', 'Sesuai Price List Mei 2026, untuk bidang lurus. Desain lengkung, CNC atau groove dihitung terpisah', 'Pendukung'),
  ('CF04', 'Kabinet Bawah Tangga', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk membantu menata area bawah tangga dengan ruang penyimpanan yang lebih praktis.', 'Kabinet custom terpasang sesuai desain 3D yang disetujui', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), engsel garansi 1 tahun, pengiriman Jabodetabek', 'Pekerjaan sipil dan finishing (coran, dinding, keramik, instalasi) masuk produk Sipil & Renovasi, dihitung terpisah', 'per m²', 2000000, 5000000, 'Sekitar 2 minggu dari mulai produksi', 'Homeowners', 'Upsell', 'Draft', 'Harga menyesuaikan pilihan material', 'Pendukung'),
  ('CF06', 'Vanity Kamar Mandi', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk memaksimalkan ruangan kamar mandi dengan furniture yang fungsional dan estetik.', 'Vanity custom terpasang sesuai desain 3D. Komponen menyesuaikan pesanan: kabinet vanity, top table, cermin, wastafel, kran', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), engsel dan rel laci garansi 1 tahun, pengiriman Jabodetabek. Wastafel dan kran bermerek juga dapat garansi pabrikan', 'Pekerjaan sipil dan finishing (coran, dinding, keramik, instalasi) masuk produk Sipil & Renovasi, dihitung terpisah', 'per m²', 2000000, 5000000, 'Sekitar 2 minggu dari mulai produksi', 'Semua Segmen', 'Upsell', 'Draft', 'Harga menyesuaikan pilihan material dan komponen. Wastafel dan kran bisa disediakan atau dari klien. Material tahan air?', 'Pendukung'),
  ('CF07', 'Loose Furniture', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk membuat furniture custom yang sesuai dengan ukuran, selera dan spesifikasi yang dibutuhkan oleh customer pada ruangan. Produk ini termasuk rak, meja, kursi, sofa, dipan kasur dsb.', 'Furniture custom jadi, dikirim dan dipasang di lokasi', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), pengiriman Jabodetabek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per unit', 2400000, NULL, 'Sekitar 2 minggu dari mulai produksi', 'Semua Segmen', 'Upsell', 'Draft', 'Sudah digabung dengan Rak & Meja Custom (CF05)', 'Pendukung'),
  ('CF08', 'Bedroom Set', 'Interior & Konstruksi', 'Custom Furniture', 'Produk ini bertujuan untuk menata kamar tidur dengan satu set furniture yang serasi, terdiri dari dipan, 2 nakas dan meja rias, sesuai ukuran kamar dan selera pengguna.', 'Dipan, 2 nakas dan meja rias custom terpasang sesuai desain 3D', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), pengiriman Jabodetabek', 'Pekerjaan sipil dan finishing (coran, dinding, keramik, instalasi) masuk produk Sipil & Renovasi, dihitung terpisah', 'per set', 9750000, 17250000, 'Sekitar 2 minggu dari mulai produksi', 'Homeowners', 'Core', 'Perlu validasi', 'Sesuai Price List Mei 2026, estimasi 5 m² per set. Mulai Blockboard HPL, paling tinggi HMR atau PVC Board Duco', 'Pendukung'),
  ('FI01', 'Plafon', 'Interior & Konstruksi', 'Finishing Interior', 'Produk ini bertujuan untuk membuat atau memperbarui plafon ruangan supaya terlihat lebih rapi dan modern, termasuk pilihan model drop ceiling dan penempatan lampu sesuai kebutuhan ruangan.', 'Plafon terpasang sesuai desain, termasuk finishing', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing)', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', 450000, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('FI02', 'Wall Panel', 'Interior & Konstruksi', 'Finishing Interior', 'Produk ini bertujuan untuk mempercantik dinding dengan panel dekoratif, sehingga ruangan punya karakter dan terlihat lebih premium tanpa harus renovasi besar.', 'Wall panel terpasang sesuai desain, termasuk finishing', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing)', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', 900000, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('FI03', 'Partisi', 'Interior & Konstruksi', 'Finishing Interior', 'Produk ini bertujuan untuk membagi satu ruangan menjadi beberapa area sesuai fungsinya, misalnya ruang kerja, ruang meeting atau area privat, tanpa harus membangun dinding permanen.', 'Partisi terpasang sesuai desain, termasuk finishing', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing)', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', 900000, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('FI04', 'Lantai Vinyl', 'Interior & Konstruksi', 'Finishing Interior', 'Produk ini bertujuan untuk mengganti atau melapisi lantai dengan vinyl yang tampilannya mirip kayu, lebih tahan air dan lebih cepat dipasang dibanding lantai konvensional.', 'Lantai vinyl terpasang dan siap dipakai', 'Garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('FI05', 'Wallpaper', 'Interior & Konstruksi', 'Finishing Interior', 'Produk ini bertujuan untuk mengubah suasana ruangan lewat motif dan warna dinding yang sesuai dengan tema dan selera pengguna, dengan proses pengerjaan yang relatif cepat.', 'Wallpaper terpasang rapi sesuai motif pilihan', 'Garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('FI06', 'Cat Dinding', 'Interior & Konstruksi', 'Finishing Interior', 'Produk ini bertujuan untuk memperbarui tampilan dinding ruangan dengan warna yang sesuai tema, sehingga ruangan terasa lebih bersih, segar dan nyaman ditempati.', 'Dinding selesai dicat sesuai warna pilihan', 'Garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Entry', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('SR01', 'Bongkar Pasang Dinding', 'Interior & Konstruksi', 'Sipil & Renovasi', 'Produk ini bertujuan untuk mengubah tata letak ruangan dengan membongkar atau membangun dinding baru, supaya pembagian ruang lebih sesuai dengan kebutuhan pengguna.', 'Dinding selesai dibongkar atau dibangun, siap untuk tahap finishing', 'Garansi 3 bulan (material, pekerjaan, finishing)', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Core', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('SR02', 'Pasang Keramik', 'Interior & Konstruksi', 'Sipil & Renovasi', 'Produk ini bertujuan untuk memasang atau mengganti keramik lantai maupun dinding, supaya ruangan lebih rapi, mudah dibersihkan dan tahan lama.', 'Keramik terpasang rapi sesuai pola yang disetujui', 'Garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Upsell', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('SR04', 'Renovasi Kamar Mandi', 'Interior & Konstruksi', 'Sipil & Renovasi', 'Produk ini bertujuan untuk merombak kamar mandi supaya lebih bersih, aman dan nyaman, mulai dari keramik, saluran air hingga penataan perlengkapan di dalamnya.', 'Kamar mandi selesai direnovasi sesuai desain dan RAB yang disetujui', 'Garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per proyek', NULL, NULL, 'Tergantung lingkup', 'Homeowners', 'Core', 'Draft', 'Dikerjakan tim sendiri', 'Pendukung'),
  ('PR03', 'Fit Out Cafe & Restoran', 'Interior & Konstruksi', 'Proyek Komersial', 'Produk ini bertujuan untuk mengerjakan interior cafe dan restoran dari desain hingga siap buka, dengan suasana yang sesuai identitas brand dan alur kerja yang efisien untuk operasional.', 'Desain 3D, gambar kerja dan interior cafe siap dipakai operasional', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek, pengiriman Jabodetabek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per proyek', NULL, NULL, 'Tergantung lingkup', 'Cafe & Restoran', 'Core', 'Draft', 'Belum ada portofolio cafe terdokumentasi', 'Pendukung'),
  ('PR04', 'Fit Out Kantor', 'Interior & Konstruksi', 'Proyek Komersial', 'Produk ini bertujuan untuk mengerjakan interior kantor dari desain hingga siap dipakai, supaya ruang kerja lebih produktif, nyaman untuk tim dan terlihat profesional di mata klien.', 'Desain 3D, gambar kerja dan interior kantor siap dipakai', 'Desain 3D, garansi 3 bulan (material, pekerjaan, finishing), plus garansi pabrikan untuk material bermerek, pengiriman Jabodetabek', 'Di luar daftar yang termasuk, dihitung terpisah', 'per proyek', NULL, NULL, 'Tergantung lingkup', 'Perusahaan / Kantor', 'Core', 'Draft', 'Isi paket apa aja?', 'Pendukung'),
  ('MT01', 'Servis Furniture', 'Maintenance', 'Perawatan', 'Produk ini bertujuan untuk merawat dan memperbaiki furniture supaya tetap awet dan berfungsi dengan baik, termasuk furniture yang bukan buatan Mas BIG.', 'Furniture kembali berfungsi normal setelah diperbaiki atau dirawat', 'Kunjungan dan pengecekan gratis, garansi 3 bulan untuk bagian yang dikerjakan', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Entry', 'Draft', 'Jadi pintu masuk klien baru karena menerima furniture buatan vendor lain', 'Utama'),
  ('MT02', 'Perbaikan Interior', 'Maintenance', 'Perawatan', 'Produk ini bertujuan untuk memperbaiki kerusakan pada interior ruangan seperti plafon, dinding, panel atau finishing lainnya, termasuk interior yang bukan buatan Mas BIG.', 'Kerusakan interior selesai diperbaiki dan kembali rapi', 'Kunjungan dan pengecekan gratis, garansi 3 bulan untuk bagian yang dikerjakan', 'Di luar daftar yang termasuk, dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Entry', 'Draft', NULL, 'Pendukung'),
  ('MT03', 'Perbaikan Sipil', 'Maintenance', 'Perawatan', 'Produk ini bertujuan untuk memperbaiki, merawat atau mengganti bagian bangunan seperti dinding, atap, lantai, saluran air dan kusen, di rumah, ruko, kantor maupun gedung, supaya kembali berfungsi dengan baik, aman dan laik pakai.', 'Kerusakan sipil selesai diperbaiki dan kembali rapi seperti semula', 'Kunjungan dan pengecekan gratis, garansi 3 bulan untuk bagian yang dikerjakan', 'Pembangunan baru, di luar daftar yang termasuk dihitung terpisah', 'per m²', NULL, NULL, 'Sekitar 2 minggu', 'Semua Segmen', 'Entry', 'Draft', 'Pintu masuk paling ramai saat ini (bocor, rembes). Tidak termasuk pembangunan baru', 'Utama')
on conflict (kode) do nothing;
