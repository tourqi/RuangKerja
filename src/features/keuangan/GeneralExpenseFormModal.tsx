"use client";
import { useState, useEffect } from "react";
import type { GeneralExpense, GeneralExpenseKategori } from "@/types/db";
import { addGeneralExpense, updateGeneralExpense } from "@/services/generalExpenses";
import { Select } from "@/components/Select";
import { NumberInput } from "@/components/NumberInput";

const KATEGORI_OPTIONS: { value: GeneralExpenseKategori; label: string }[] = [
  { value: "operasional", label: "Operasional Kantor" },
  { value: "marketing", label: "Marketing & Iklan" },
  { value: "gaji", label: "Gaji & SDM" },
  { value: "lainnya", label: "Lainnya" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  expense?: GeneralExpense | null;
}

export function GeneralExpenseFormModal({ open, onClose, onSaved, expense }: Props) {
  const isEdit = !!expense;
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    tanggal: today,
    deskripsi: "",
    kategori: "operasional" as GeneralExpenseKategori,
    sub_kategori: "",
    jumlah: "",
    vendor: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (expense) {
        setForm({
          tanggal: expense.tanggal.slice(0, 10),
          deskripsi: expense.deskripsi,
          kategori: expense.kategori,
          sub_kategori: expense.sub_kategori ?? "",
          jumlah: String(expense.jumlah),
          vendor: expense.vendor ?? "",
          notes: expense.notes ?? "",
        });
      } else {
        setForm({
          tanggal: today,
          deskripsi: "",
          kategori: "operasional",
          sub_kategori: "",
          jumlah: "",
          vendor: "",
          notes: "",
        });
      }
      setError(null);
    }
  }, [open, expense]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const jumlah = parseFloat(form.jumlah.replace(/[^\d.]/g, ""));
    if (!form.deskripsi.trim()) return setError("Deskripsi wajib diisi.");
    if (isNaN(jumlah) || jumlah <= 0) return setError("Jumlah harus lebih dari 0.");

    setSaving(true);
    setError(null);
    try {
      const payload = {
        tanggal: form.tanggal,
        deskripsi: form.deskripsi.trim(),
        kategori: form.kategori,
        sub_kategori: form.sub_kategori.trim() || undefined,
        jumlah,
        vendor: form.vendor.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (isEdit && expense) {
        await updateGeneralExpense(expense.id, payload);
      } else {
        await addGeneralExpense(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => set("tanggal", e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
              <Select
                value={form.kategori}
                onChange={(v) => set("kategori", v)}
                options={KATEGORI_OPTIONS}
                includeEmptyOption={false}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
            <input
              type="text"
              value={form.deskripsi}
              onChange={(e) => set("deskripsi", e.target.value)}
              placeholder="Contoh: Tagihan listrik kantor, Biaya iklan Instagram..."
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sub-kategori <span className="text-gray-400">(opsional)</span></label>
              <input
                type="text"
                value={form.sub_kategori}
                onChange={(e) => set("sub_kategori", e.target.value)}
                placeholder="Contoh: Listrik, Meta Ads..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
              <NumberInput
                value={form.jumlah}
                onValueChange={(v) => set("jumlah", v)}
                placeholder="0"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor / Penerima <span className="text-gray-400">(opsional)</span></label>
            <input
              type="text"
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="Nama vendor atau penerima pembayaran"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan <span className="text-gray-400">(opsional)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Keterangan tambahan..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
