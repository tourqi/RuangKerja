"use client";
import { useState, type ChangeEvent, type SyntheticEvent } from "react";
import { Client } from "@/types/db";
import { addClient, updateClient } from "@/services/clients";
import { useToast } from "@/components/Toast";
import {
  PROPERTY_TYPES,
  BUDGET_RANGES,
  CLIENT_LEAD_STATUSES,
  SOURCES,
} from "@/constants/options";

type Props = {
  client?: Client | null;
  onSaved: () => void;
  onClose: () => void;
  onSavedAndAddLead?: (client: Client) => void;
};

export function ClientFormModal({ client, onSaved, onClose, onSavedAndAddLead }: Props) {
  const toast = useToast();
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

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await updateClient(client.id, form);
        toast("Client berhasil diperbarui", "success");
        onSaved();
      } else {
        const newClient = await addClient({ ...form, name: form.name || "" });
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
              <input name="phone" value={form.phone || ""} onChange={handleChange} required maxLength={13} pattern="[0-9]*" placeholder="08xxxxxxxxxx" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none" />
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
              <select name="property_type" value={form.property_type || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none">
                <option value="">Pilih tipe</option>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
              <select name="budget_range" value={form.budget_range || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none">
                <option value="">Pilih budget</option>
                {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Lead</label>
              <select name="lead_status" value={form.lead_status || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none">
                <option value="">Pilih status</option>
                {CLIENT_LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sumber</label>
              <select name="source" value={form.source || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none">
                <option value="">Pilih sumber</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
              <select name="priority" value={form.priority || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none">
                <option value="">Pilih prioritas</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tambahan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
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
