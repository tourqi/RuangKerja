# DESIGN.md — RuangKerja

Panduan tampilan untuk aplikasi internal RuangKerja (ERP studio interior). Ikuti dokumen ini untuk
setiap perubahan UI. Kalau perlu menyimpang, tulis alasannya di bagian **Pengecualian**.

## Arah: "Presisi"

Tool kerja yang padat dan tenang, dipakai tim setiap hari. Hampir monokrom dengan **satu warna aksen**.
Hierarki dibangun dengan tipografi, garis tipis, dan jarak. Kotak, bayangan, dan warna tidak dipakai
untuk itu. Warna mencolok hanya untuk hal yang butuh tindakan (telat, belum dibayar, gagal).

Yang dihindari: tampilan default Tailwind (`rounded-xl` + `shadow-sm` di setiap blok), pill pastel
warna-warni, ikon berwarna di setiap kartu, dan judul generik seperti "Daftar X" yang mengulang judul halaman.

## Token (src/app/globals.css)

Selalu pakai token. Jangan pakai kelas `gray-*`, `blue-*`, dan sejenisnya, atau hex langsung di komponen.

| Token | Nilai | Dipakai untuk | Kontras di putih |
|---|---|---|---|
| `ink` | #0f1115 | Teks utama, angka | 18,9:1 |
| `muted` | #575d66 | Teks sekunder, label | 6,6:1 |
| `faint` | #6b717a | Teks tersier, sub-keterangan, placeholder | 4,9:1 |
| `line` / `line-strong` | #e5e7eb / #d4d7dd | Garis & border | — |
| `surface` / `hover` | #f7f8fa / #f2f3f6 | Latar header tabel, sidebar, hover | — |
| `accent` | #3247d1 | Tombol utama, link, fokus, tab aktif | 7,1:1 |
| `danger` | #c4352b | Telat, gagal, hapus | 5,4:1 |
| `warning` | #9a6312 | Perlu perhatian, piutang 31–60 hari | 5,0:1 |
| `success` | #2a7d46 | Lunas, deal won | 5,1:1 |

Varian `*-soft` (`accent-soft`, `danger-soft`, dan seterusnya) hanya untuk latar banner atau sorotan,
dan tidak untuk teks. Semua warna teks wajib ≥ 4,5:1 di latar tempat ia dipakai (WCAG AA).

## Tipografi

- **IBM Plex Sans** untuk semua teks UI. **IBM Plex Mono** hanya untuk angka uang dan angka KPI.
- Semua angka memakai `tabular-nums` (sudah global di `body`) supaya kolom rata.
- Ukuran: judul halaman `text-xl font-semibold tracking-tight`, isi tabel dan kontrol `text-[13px]`,
  label dan sub-teks `text-xs`. Hindari `font-bold`, dan pakai `font-semibold` atau `font-medium`.
- Tidak ada label huruf kapital semua (`uppercase tracking-wide`).

## Status

Status ditampilkan sebagai **titik warna + teks** lewat `StatusDot` (src/components/ui/StatusDot.tsx)
atau kelas `tone-neutral | tone-active | tone-success | tone-warning | tone-danger`. Peta status ke
tone ada di satu tempat (`*_STATUS_TONE`). Jangan membuat peta warna status baru di dalam komponen.

## Pola halaman

- **Halaman daftar** (Clients, Leads, Projects, Invoice, Pengeluaran Umum): judul → baris jumlah data
  dan tombol (Export sekunder, Tambah utama) → filter ringkas → tabel. Tidak ada pita toolbar abu-abu
  dan tidak ada judul "Daftar X".
- **Halaman detail** (Project, Lead, Client, editor RAB): header tanpa kotak (judul, satu baris info
  dengan status dan atribut penting, stepper tahapan bila relevan) → strip angka utama → `DetailTabs`.
  Tab aktif disimpan di URL (`?tab=`).
- **Tabel**: header `bg-surface text-xs font-medium text-muted`, sel `px-3 py-2`, angka rata kanan.
  Aksi per baris memakai `ActionDropdown` tanpa label, sehingga tampil sebagai ikon "⋯".
- **Tombol**: satu tombol utama (`bg-accent`) per area. Tombol lain sekunder (`border-line bg-white`).
  Ukuran ringkas `px-2.5 py-1.5 text-[13px]`. Tombol hapus memakai teks `danger`.
- **Dashboard (V2)**: grafik, bukan tabel. Judul grafik berisi kesimpulan yang dihitung dari data,
  misalnya "4 dari 5 proyek berjalan sudah lewat tenggat".

## Grafik

Palet kategori (urutan tetap, sudah divalidasi aman buta warna): `#3247d1`, `#eb6834`, `#1baf7a`,
`#eda100`, `#e87ba4`, `#008300`, dan abu-abu `#c9cdd3` untuk "lainnya/belum". Warna status (`success`,
`warning`, `danger`) hanya untuk makna status. Teks di grafik memakai token teks, bukan warna seri.
Satu sumbu Y saja.

## Teks & format

- **Bahasa Indonesia** untuk semua label, tombol, dan pesan. Nama modul di menu (Clients, Leads,
  Projects, Invoice) dan kata serapan umum (Edit, Lead, Follow-up, PIC) tetap.
- **Tanggal** tampil sebagai `5 Agu 2026` lewat `formatDate()`. Ekspor CSV memakai `formatDateISO()`
  (`2026-08-05`). Judul periode laporan boleh memakai nama bulan lengkap.
- **Uang** memakai `formatIDR()` / `formatRupiah()` (`Rp 1.500.000`), atau `shortIDR()` (`Rp1,5 jt`) di grafik dan judul.
- **Nilai kosong** memakai `—`.
- Pesan error menjelaskan apa yang gagal dan cara memperbaikinya. Tanpa permintaan maaf dan tanpa kalimat samar.

## Perilaku wajib

- **Konfirmasi hapus**: setiap aksi hapus memakai `useConfirm()` (src/components/ConfirmProvider.tsx).
  Jangan memakai `window.confirm()`.
- **Gagal memuat ≠ kosong**: data SWR yang gagal otomatis memunculkan banner "Sebagian data gagal
  dimuat" (`DataErrorBanner`). Data yang dimuat manual di luar SWR wajib menampilkan error dan tombol
  "Coba lagi" sendiri, bukan diam lalu terlihat seperti "belum ada data".
- **Fokus keyboard** selalu terlihat (aturan global `:focus-visible`). Elemen yang bisa diklik harus
  berupa `button`/`a`. Kalau terpaksa memakai elemen lain, beri `tabIndex={0}`, `role`, dan handler Enter/Spasi.
- **Status dengan warna selalu disertai teks.** Arti tidak boleh hanya disampaikan lewat warna.
- **Modal**: taruh `<DialogA11y onClose={...} />` sebagai anak pertama panel modal. Komponen ini
  mengatur Escape, fokus awal (kolom isian pertama, atau tombol "Batal" di dialog konfirmasi),
  Tab yang berputar di dalam modal, dan pengembalian fokus saat modal ditutup.
- **Label form** selalu terhubung ke kontrolnya (`htmlFor` + `id`). `Select` dan `MultiSelect`
  menerima prop `id`. Untuk kontrol di dalam `.map()`, buat `id` dari key, bukan `id` statis.
- **Gerakan**: aturan global `prefers-reduced-motion` mematikan animasi dan transisi bagi pengguna
  yang memintanya. Jangan menimpa aturan ini.
- **Deretan angka**: pakai strip bergaris tipis (`flex flex-wrap gap-px bg-line border rounded-md`,
  dengan sel `bg-white`), dikelompokkan per topik dengan judul kecil. Hindari grid kartu identik.

## Pengecualian (disengaja)

| Keputusan | Alasan |
|---|---|
| Tema terang saja, tanpa dark mode | Aplikasi internal, dipakai di kantor/siang hari. `color-scheme: light` dipaksa agar kontrol bawaan browser tidak berubah gelap. |
| Plex Mono untuk angka | Kolom Rupiah harus rata dan mudah dipindai. Hanya untuk angka, tidak untuk teks. |
| Tabel lebar boleh digeser horizontal | Data operasional punya banyak kolom. Di layar HP, halaman daftar memakai tampilan kartu (`MobileCard`). |
| Tanda `—` untuk nilai kosong | Konvensi tabel keuangan, lebih jelas daripada sel kosong. |
| Dokumen untuk klien (print RAB/SPH/Invoice, Word, Excel) tidak mengikuti gaya ini | Dokumen keluar punya format resminya sendiri. |
