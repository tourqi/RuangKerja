"use client";
import { useState, type ChangeEvent, type SyntheticEvent } from "react";
import type { Product, ProductPrioritas, ProductStatus, ProductTangga } from "@/types/db";
import { addProduct, updateProduct } from "@/services/products";
import { useToast } from "@/components/Toast";
import { Select } from "@/components/Select";
import { NumberInput } from "@/components/NumberInput";
import { DialogA11y } from "@/components/DialogA11y";
import {
  PRODUCT_KATEGORI,
  PRODUCT_LINI,
  PRODUCT_PRIORITAS,
  PRODUCT_SATUAN,
  PRODUCT_SEGMEN,
  PRODUCT_STATUSES,
  PRODUCT_TANGGA,
  PRODUCT_TANGGA_LABELS,
  toOptions,
} from "@/constants/options";

type Props = {
  product?: Product | null;
  onSaved: () => void;
  onClose: () => void;
};

const INPUT_CLASS = "w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25";
const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;
const LABEL_CLASS = "block text-sm font-medium text-ink mb-1";

const TEXT_COLUMNS = [
  "lini", "deskripsi", "deliverable", "sudah_termasuk", "tidak_termasuk",
  "satuan", "estimasi_durasi", "segmen", "tangga", "catatan", "prioritas",
] as const;

export function ProductFormModal({ product, onSaved, onClose }: Props) {
  const toast = useToast();
  const isEditing = !!product;
  const [form, setForm] = useState<Partial<Product>>(product ?? { status: "Draft", aktif: true });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const kode = form.kode?.trim().toUpperCase();
    const nama = form.nama?.trim();
    if (!kode || !nama || !form.kategori) {
      toast("Isi kode, nama, dan kategori produk.", "warning");
      return;
    }
    if (form.harga_mulai != null && form.harga_sampai != null && form.harga_sampai < form.harga_mulai) {
      toast("Harga sampai tidak boleh lebih kecil dari harga mulai.", "warning");
      return;
    }
    const textValues = Object.fromEntries(TEXT_COLUMNS.map((k) => [k, form[k]?.trim() || null]));
    const payload = {
      ...textValues,
      kode,
      nama,
      kategori: form.kategori,
      harga_mulai: form.harga_mulai ?? null,
      harga_sampai: form.harga_sampai ?? null,
      status: form.status ?? "Draft",
      aktif: form.aktif ?? true,
    } as unknown as Omit<Product, "id" | "created_at">;

    setSaving(true);
    try {
      if (isEditing) {
        await updateProduct(product.id, payload);
        toast("Produk berhasil diperbarui", "success");
      } else {
        await addProduct(payload);
        toast("Produk berhasil ditambahkan", "success");
      }
      onSaved();
    } catch (err: unknown) {
      const pg = err as { code?: string; message?: string };
      const message = pg.code === "23505" ? `Kode ${kode} sudah dipakai produk lain.` : pg.message || "Periksa koneksi lalu coba lagi.";
      toast(`Gagal menyimpan produk: ${message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogA11y onClose={onClose} />
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">{isEditing ? "Edit Produk" : "Tambah Produk"}</h2>
          <button
            aria-label="Tutup"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition"
            onClick={onClose}
          >✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-kode" className={LABEL_CLASS}>Kode <span className="text-danger">*</span></label>
              <input id="product-kode" name="kode" value={form.kode || ""} onChange={handleChange} placeholder="CF01" className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="product-nama" className={LABEL_CLASS}>Nama Produk <span className="text-danger">*</span></label>
              <input id="product-nama" name="nama" value={form.nama || ""} onChange={handleChange} placeholder="Kitchen Set" className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="product-lini" className={LABEL_CLASS}>Lini Layanan</label>
              <Select id="product-lini" value={form.lini || ""} onChange={(v) => setForm((prev) => ({ ...prev, lini: v }))} options={toOptions(PRODUCT_LINI)} placeholder="Pilih lini" />
            </div>
            <div>
              <label htmlFor="product-kategori" className={LABEL_CLASS}>Kategori <span className="text-danger">*</span></label>
              <Select id="product-kategori" value={form.kategori || ""} onChange={(v) => setForm((prev) => ({ ...prev, kategori: v }))} options={toOptions(PRODUCT_KATEGORI)} placeholder="Pilih kategori" />
            </div>
            <div>
              <label htmlFor="product-tangga" className={LABEL_CLASS}>Tangga Produk</label>
              <Select
                id="product-tangga"
                value={form.tangga || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, tangga: (v || undefined) as ProductTangga | undefined }))}
                options={PRODUCT_TANGGA.map((value) => ({ value, label: PRODUCT_TANGGA_LABELS[value] }))}
                placeholder="Pilih tangga"
              />
            </div>
            <div>
              <label htmlFor="product-segmen" className={LABEL_CLASS}>Segmen Utama</label>
              <Select id="product-segmen" value={form.segmen || ""} onChange={(v) => setForm((prev) => ({ ...prev, segmen: v }))} options={toOptions(PRODUCT_SEGMEN)} placeholder="Pilih segmen" />
            </div>
            <div>
              <label htmlFor="product-harga-mulai" className={LABEL_CLASS}>Harga Mulai</label>
              <NumberInput id="product-harga-mulai"
                value={form.harga_mulai}
                onValueChange={(digits) => setForm((prev) => ({ ...prev, harga_mulai: digits ? Number(digits) : undefined }))}
                placeholder="Rp"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="product-harga-sampai" className={LABEL_CLASS}>Harga Sampai</label>
              <NumberInput id="product-harga-sampai"
                value={form.harga_sampai}
                onValueChange={(digits) => setForm((prev) => ({ ...prev, harga_sampai: digits ? Number(digits) : undefined }))}
                placeholder="Rp"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="product-satuan" className={LABEL_CLASS}>Satuan Harga</label>
              <Select id="product-satuan" value={form.satuan || ""} onChange={(v) => setForm((prev) => ({ ...prev, satuan: v }))} options={toOptions(PRODUCT_SATUAN)} placeholder="Pilih satuan" />
            </div>
            <div>
              <label htmlFor="product-durasi" className={LABEL_CLASS}>Estimasi Durasi</label>
              <input id="product-durasi" name="estimasi_durasi" value={form.estimasi_durasi || ""} onChange={handleChange} placeholder="Sekitar 2 minggu" className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="product-status" className={LABEL_CLASS}>Status</label>
              <Select id="product-status" value={form.status || "Draft"} onChange={(v) => setForm((prev) => ({ ...prev, status: v as ProductStatus }))} options={toOptions(PRODUCT_STATUSES)} includeEmptyOption={false} />
            </div>
            <div>
              <label htmlFor="product-prioritas" className={LABEL_CLASS}>Prioritas</label>
              <Select
                id="product-prioritas"
                value={form.prioritas || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, prioritas: (v || undefined) as ProductPrioritas | undefined }))}
                options={toOptions(PRODUCT_PRIORITAS)}
                placeholder="Pilih prioritas"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="product-deskripsi" className={LABEL_CLASS}>Deskripsi Singkat</label>
              <textarea id="product-deskripsi" name="deskripsi" value={form.deskripsi || ""} onChange={handleChange} rows={2} className={TEXTAREA_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="product-deliverable" className={LABEL_CLASS}>Yang Didapat Klien</label>
              <textarea id="product-deliverable" name="deliverable" value={form.deliverable || ""} onChange={handleChange} rows={2} className={TEXTAREA_CLASS} />
            </div>
            <div>
              <label htmlFor="product-termasuk" className={LABEL_CLASS}>Sudah Termasuk</label>
              <textarea id="product-termasuk" name="sudah_termasuk" value={form.sudah_termasuk || ""} onChange={handleChange} rows={3} className={TEXTAREA_CLASS} />
            </div>
            <div>
              <label htmlFor="product-tidak-termasuk" className={LABEL_CLASS}>Tidak Termasuk / Biaya Terpisah</label>
              <textarea id="product-tidak-termasuk" name="tidak_termasuk" value={form.tidak_termasuk || ""} onChange={handleChange} rows={3} className={TEXTAREA_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="product-catatan" className={LABEL_CLASS}>Catatan</label>
              <textarea id="product-catatan" name="catatan" value={form.catatan || ""} onChange={handleChange} rows={2} className={TEXTAREA_CLASS} />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={form.aktif ?? true}
                onChange={(e) => setForm((prev) => ({ ...prev, aktif: e.target.checked }))}
                className="accent-accent"
              />
              Tampilkan di pilihan produk lead
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50">
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Produk"}
            </button>
            <button type="button" className="px-6 py-2 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
