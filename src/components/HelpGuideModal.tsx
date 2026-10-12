"use client";
import { useState, type ComponentType, type SVGProps } from "react";
import {
  UsersIcon, FunnelIcon, BuildingIcon, ClipboardListIcon, ReceiptIcon, BanknotesIcon,
  WalletIcon, CoinsIcon, GridIcon, LockIcon,
} from "@/components/icons/AppIcons";
import { DialogA11y } from "./DialogA11y";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type GuideField = { name: string; required?: boolean; rule: string };
type GuideSection = {
  id: string;
  title: string;
  where: string;
  icon: IconComponent;
  fields: GuideField[];
  notes?: string[];
};

const SECTIONS: GuideSection[] = [
  {
    id: "client",
    title: "Client",
    where: "Clients → Tambah Client / Edit",
    icon: UsersIcon,
    fields: [
      { name: "Nama", required: true, rule: "Wajib diisi." },
      { name: "No. HP", required: true, rule: "Wajib diisi. Hanya angka, otomatis dipotong maksimal 13 digit." },
      { name: "Alamat, Nama Project", rule: "Opsional, teks bebas." },
      { name: "Tipe Properti", rule: "Pilih salah satu: Rumah, Ruko, Apartemen, Tanah." },
      { name: "Budget", rule: "Pilih salah satu: < 500jt, 500jt - 1M, > 1M." },
      { name: "Status Lead, Sumber, Prioritas, Catatan", rule: "Opsional." },
    ],
    notes: [
      "Setelah client baru tersimpan, akan muncul pilihan untuk langsung lanjut mengisi data Lead untuk client tersebut.",
    ],
  },
  {
    id: "lead",
    title: "Lead",
    where: "Leads → Tambah Lead / Edit",
    icon: FunnelIcon,
    fields: [
      { name: "Client", required: true, rule: "Wajib pilih client yang sudah ada (cari lewat nama/telepon, tidak bisa mengetik nama client baru di sini)." },
      { name: "Status", required: true, rule: "Default \"New Lead\". Pilihan: New Lead, Contacted, Survey, Deal, Lost." },
      { name: "Priority", rule: "Opsional: Low, Medium, High, Urgent." },
      { name: "Source", rule: "Otomatis terisi dari data Sumber client (tidak bisa diketik ulang di form ini — ubah dari data Client)." },
      { name: "Follow Up Date, Last Contacted, Closed At", rule: "Opsional, tanggal." },
    ],
    notes: [
      "Saat status diubah menjadi Deal dan lead baru tersimpan, ada pilihan untuk langsung lanjut membuat Project dari lead tersebut.",
    ],
  },
  {
    id: "project",
    title: "Project",
    where: "Projects → Tambah Project / Edit",
    icon: BuildingIcon,
    fields: [
      { name: "Nama Project", required: true, rule: "Wajib diisi." },
      { name: "Client (Lead Deal)", rule: "Cari dari daftar client yang salah satu lead-nya sudah berstatus Deal — client lain tidak muncul di pencarian." },
      { name: "Lead", rule: "Muncul setelah client dipilih, berisi lead-lead Deal milik client tersebut. Kalau lead ini punya RAB berstatus Disetujui, Nilai Project otomatis terisi dari total RAB dikurangi diskon." },
      { name: "Nilai Project (Rp)", rule: "Bisa diisi manual, dot ribuan otomatis saat mengetik. Kalau memilih Lead dengan RAB disetujui, nilai ini ditimpa otomatis." },
      { name: "Status", required: true, rule: "Default Planning. Pilihan: Planning, Design, Produksi, Instalasi, Selesai." },
      { name: "Start Date, Deadline, Assigned To", rule: "Opsional." },
      { name: "Progress", rule: "Geser 0–100%, kelipatan 5%." },
    ],
  },
  {
    id: "rab",
    title: "RAB (Rencana Anggaran Biaya)",
    where: "Leads → Detail Lead → Buat RAB / Buka RAB",
    icon: ClipboardListIcon,
    fields: [
      { name: "Nama RAB", required: true, rule: "Wajib diisi saat membuat RAB baru dari halaman Detail Lead." },
      { name: "Section & Item", rule: "Tambah section bebas, lalu tambah item per section: Spesifikasi (teks), Qty (angka, boleh desimal), Unit (teks), Harga satuan (Rp, dot ribuan otomatis). Semua tersimpan otomatis saat pindah field (blur), tanpa tombol simpan." },
      { name: "Diskon", rule: "Isi salah satu — persen atau nilai Rp — yang lain otomatis terhitung mengikuti." },
      { name: "Skema Pembayaran", rule: "Tambah tahap dengan Keterangan + Persen. Total seluruh tahap sebaiknya 100% (dipakai sebagai saran termin saat membuat Invoice)." },
      { name: "Status RAB", rule: "Draft, Terkirim, atau Disetujui — diubah dari halaman Detail Lead. Hanya RAB berstatus Disetujui yang bisa dipakai untuk membuat Project/Invoice." },
    ],
    notes: [
      "RAB yang sudah LUNAS (semua invoice yang terhubung ke RAB itu berstatus Lunas) otomatis terkunci: nama, item, diskon, dan skema pembayaran tidak bisa diubah atau dihapus, status tidak bisa diganti, dan RAB itu sendiri tidak bisa dihapus.",
    ],
  },
  {
    id: "invoice",
    title: "Invoice",
    where: "Invoices → Buat Invoice, atau dari Detail Project → Tambah Invoice",
    icon: ReceiptIcon,
    fields: [
      { name: "Project", required: true, rule: "Wajib dipilih. Kalau dibuka dari halaman Detail Project, otomatis terkunci ke project itu." },
      { name: "RAB", rule: "Opsional — hanya menampilkan RAB berstatus Disetujui milik project. Kalau dipilih, Total RAB, diskon, dan saran termin berikutnya (dari Skema Pembayaran RAB) otomatis terisi." },
      { name: "Diskon", rule: "Hanya bisa diisi kalau RAB dipilih; persen dan nilai Rp saling menyesuaikan otomatis." },
      { name: "Tanggal Invoice", required: true, rule: "Wajib diisi." },
      { name: "Termin Pembayaran", required: true, rule: "Minimal 1 termin dengan Nama diisi dan Jumlah > 0. Bisa tambah beberapa termin sekaligus — masing-masing jadi satu invoice terpisah saat disimpan." },
      { name: "Catatan", rule: "Opsional." },
    ],
    notes: [
      "Kalau RAB yang dipilih sudah LUNAS, seluruh form (diskon, tanggal, termin, catatan) otomatis terkunci dan tombol Buat Invoice nonaktif — tidak bisa membuat invoice tambahan untuk RAB yang sudah lunas.",
    ],
  },
  {
    id: "payment",
    title: "Pembayaran Invoice",
    where: "Detail Invoice → Tambah Pembayaran",
    icon: BanknotesIcon,
    fields: [
      { name: "Jumlah (IDR)", required: true, rule: "Wajib diisi, harus lebih dari 0." },
      { name: "Tanggal Pembayaran", required: true, rule: "Wajib diisi." },
      { name: "Metode Pembayaran", rule: "Transfer, Tunai, atau Cek." },
      { name: "Catatan", rule: "Opsional." },
    ],
  },
  {
    id: "project-expense",
    title: "Pengeluaran Project",
    where: "Detail Project → Pengeluaran → + Tambah Baris",
    icon: WalletIcon,
    fields: [
      { name: "Tambah Baris", rule: "Klik tombol, baris baru langsung muncul dengan tanggal hari ini — isi langsung di tabel." },
      { name: "Tanggal, Deskripsi, Kategori, Vendor, Jumlah", rule: "Kategori pilih salah satu: Material, Jasa, Transport, Lainnya. Semua kolom tersimpan otomatis saat pindah field (blur), tanpa tombol simpan terpisah." },
    ],
  },
  {
    id: "general-expense",
    title: "Pengeluaran Umum",
    where: "Keuangan → Pengeluaran Umum → Tambah Pengeluaran",
    icon: CoinsIcon,
    fields: [
      { name: "Tanggal", required: true, rule: "Wajib diisi." },
      { name: "Kategori", required: true, rule: "Operasional Kantor, Marketing & Iklan, Gaji & SDM, atau Lainnya." },
      { name: "Deskripsi", required: true, rule: "Wajib diisi." },
      { name: "Jumlah (Rp)", required: true, rule: "Wajib diisi, harus lebih dari 0." },
      { name: "Sub-kategori, Vendor / Penerima, Catatan", rule: "Opsional." },
    ],
  },
  {
    id: "format",
    title: "Format & Aksi Umum",
    where: "Berlaku di semua tabel data",
    icon: GridIcon,
    fields: [
      { name: "Input angka Rupiah", rule: "Selalu tampil dengan pemisah ribuan titik otomatis saat mengetik (contoh: 10000 → 10.000) — cukup ketik angkanya saja." },
      { name: "Tombol \"Pilih Aksi\"", rule: "Ada di kolom paling kiri setiap tabel — berisi Detail/Lihat, Edit, dan Hapus sesuai modulnya." },
      { name: "Filter & pencarian", rule: "Hanya memengaruhi tampilan tabel, tidak mengubah data yang tersimpan." },
    ],
  },
];

export default function HelpGuideModal({ onClose }: { onClose: () => void }) {
  const [openId, setOpenId] = useState<string | null>(SECTIONS[0].id);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-10 sm:pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogA11y onClose={onClose} />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div>
            <h2 className="text-base font-semibold text-ink">Panduan Pemakaian</h2>
            <p className="text-xs text-faint mt-0.5">Cara mengisi data dan syarat/kondisi tiap form di aplikasi</p>
          </div>
          <button onClick={onClose} className="text-faint hover:text-muted transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {SECTIONS.map((s) => {
            const isOpen = openId === s.id;
            const SectionIcon = s.icon;
            return (
              <div key={s.id} className="border border-line rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-hover transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-white border border-line p-1.5 shrink-0 text-muted">
                    <SectionIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{s.title}</p>
                    <p className="text-xs text-faint truncate">{s.where}</p>
                  </div>
                  <svg
                    className={`w-4 h-4 text-faint shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-4 py-3 space-y-2.5">
                    {s.fields.map((f) => (
                      <div key={f.name} className="flex gap-2 text-xs">
                        <span className="font-semibold text-ink w-36 shrink-0">
                          {f.name}
                          {f.required && <span className="text-danger"> *</span>}
                        </span>
                        <span className="text-muted">{f.rule}</span>
                      </div>
                    ))}
                    {s.notes && s.notes.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {s.notes.map((note, i) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-2 bg-warning-soft border border-warning/25 rounded-md text-xs text-warning">
                            <span className="w-4 h-4 text-warning shrink-0 mt-0.5"><LockIcon /></span>
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
