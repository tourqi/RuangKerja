"use client";
import { useState, type ChangeEvent, type SyntheticEvent } from "react";
import { Client } from "@/types/db";
import { addClient, updateClient } from "@/services/clients";
import { useClients } from "@/hooks/useClients";
import { useToast } from "@/components/Toast";
import { Select } from "@/components/Select";
import {
  PROPERTY_TYPES,
  BUDGET_RANGES,
  CLIENT_LEAD_STATUS_COLORS,
  PRIORITY_COLORS,
  SOURCES,
  toOptions,
} from "@/constants/options";

type Props = {
  client?: Client | null;
  onSaved: () => void;
  onClose: () => void;
  onSavedAndAddLead?: (client: Client) => void;
};

export function ClientFormModal({ client, onSaved, onClose, onSavedAndAddLead }: Props) {
  const toast = useToast();
  const { clients } = useClients();
  const [form, setForm] = useState<Partial<Client>>(client ?? {});
  const [saving, setSaving] = useState(false);
  const [savedClient, setSavedClient] = useState<Client | null>(null);

  const isEditing = !!client;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) =>
      name === "phone"
        ? { ...prev, [name]: value.replace(/\D/g, "").slice(0, 13) }
        : { ...prev, [name]: value }
    );
  };

  // Nomor HP tidak boleh duplikat antar client — bandingkan digit murni supaya format lama tidak lolos.
  const phoneDigits = (form.phone || "").replace(/\D/g, "");
  const duplicateClient = phoneDigits
    ? clients.find((c) => c.id !== client?.id && (c.phone || "").replace(/\D/g, "") === phoneDigits)
    : undefined;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (duplicateClient) {
      toast(`No. HP ini sudah dipakai oleh client "${duplicateClient.name}"`, "error");
      return;
    }
    setSaving(true);
    // lead_status & priority derived otomatis dari lead terbaru (trigger DB) —
    // jangan pernah ditulis dari form ini, meski masih ada di state karena
    // diisi dari `client` awal.
    const { lead_status: _leadStatus, priority: _priority, ...formWithoutDerived } = form;
    void _leadStatus;
    void _priority;
    try {
      if (isEditing) {
        await updateClient(client.id, formWithoutDerived);
        toast("Client berhasil diperbarui", "success");
        onSaved();
      } else {
        const newClient = await addClient({ ...formWithoutDerived, name: form.name || "" });
        toast("Client berhasil ditambahkan", "success");
        if (onSavedAndAddLead) {
          setSavedClient(newClient);
        } else {
          onSaved();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast(`Gagal ${isEditing ? "update" : "menambah"} client: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (savedClient && onSavedAndAddLead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Client berhasil ditambahkan!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Ingin langsung menambahkan data <span className="font-medium text-gray-700">leads</span> untuk <span className="font-medium text-gray-700">{savedClient.name}</span>?
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition"
              onClick={() => onSavedAndAddLead(savedClient)}
            >
              Ya, Input Data Leads
            </button>
            <button
              className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
              onClick={onSaved}
            >
              Lewati
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Client" : "Tambah Client Baru"}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
              <input name="name" value={form.name || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. HP <span className="text-red-500">*</span></label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                required
                maxLength={13}
                pattern="[0-9]*"
                placeholder="08xxxxxxxxxx"
                aria-invalid={!!duplicateClient}
                className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-900 outline-none focus:ring-2 ${
                  duplicateClient
                    ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                    : "border-gray-300 focus:ring-black focus:border-black"
                }`}
              />
              {duplicateClient && (
                <p className="text-xs text-red-600 mt-1">
                  No. HP ini sudah dipakai oleh client &ldquo;{duplicateClient.name}&rdquo;
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <input name="address" value={form.address || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project</label>
              <input name="project_name" value={form.project_name || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Properti</label>
              <Select
                value={form.property_type || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, property_type: v }))}
                options={toOptions(PROPERTY_TYPES)}
                placeholder="Pilih tipe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
              <Select
                value={form.budget_range || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, budget_range: v }))}
                options={toOptions(BUDGET_RANGES)}
                placeholder="Pilih budget"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Lead</label>
              {form.lead_status ? (
                <div className="flex items-center h-[38px]">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CLIENT_LEAD_STATUS_COLORS[form.lead_status] || "bg-gray-100 text-gray-700"}`}>
                    {form.lead_status}
                  </span>
                </div>
              ) : (
                <div className="flex items-center h-[38px] text-sm text-gray-400">Belum ada lead</div>
              )}
              <p className="text-xs text-gray-400 mt-1">Otomatis mengikuti status Lead terbaru, tidak bisa diedit manual.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sumber</label>
              <Select
                value={form.source || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, source: v }))}
                options={toOptions(SOURCES)}
                placeholder="Pilih sumber"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
              {form.priority ? (
                <div className="flex items-center h-[38px]">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[form.priority] || "bg-gray-100 text-gray-700"}`}>
                    {form.priority}
                  </span>
                </div>
              ) : (
                <div className="flex items-center h-[38px] text-sm text-gray-400">Belum ada lead</div>
              )}
              <p className="text-xs text-gray-400 mt-1">Otomatis mengikuti priority Lead terbaru, tidak bisa diedit manual.</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tambahan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !!duplicateClient}
              className="px-6 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Client"}
            </button>
            <button type="button" className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
