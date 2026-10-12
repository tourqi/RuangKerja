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
import { DialogA11y } from "@/components/DialogA11y";

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
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-8 text-center">
          <DialogA11y onClose={onClose} />
          <div className="w-14 h-14 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-1">Client berhasil ditambahkan!</h3>
          <p className="text-sm text-muted mb-6">
            Ingin langsung menambahkan data <span className="font-medium text-ink">leads</span> untuk <span className="font-medium text-ink">{savedClient.name}</span>?
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition"
              onClick={() => onSavedAndAddLead(savedClient)}
            >
              Ya, Input Data Leads
            </button>
            <button
              className="w-full px-4 py-2.5 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition"
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogA11y onClose={onClose} />
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            {isEditing ? "Edit Client" : "Tambah Client Baru"}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="client-form-modal-nama" className="block text-sm font-medium text-ink mb-1">Nama <span className="text-danger">*</span></label>
              <input id="client-form-modal-nama" name="name" value={form.name || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink focus:ring-2 focus:ring-accent/25 focus:border-accent outline-none" />
            </div>
            <div>
              <label htmlFor="client-form-modal-no-hp" className="block text-sm font-medium text-ink mb-1">No. HP <span className="text-danger">*</span></label>
              <input id="client-form-modal-no-hp"
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                required
                maxLength={13}
                pattern="[0-9]*"
                placeholder="08xxxxxxxxxx"
                aria-invalid={!!duplicateClient}
                className={`w-full px-3 py-2 border rounded-md text-sm text-ink outline-none focus:ring-2 ${
                  duplicateClient
                    ? "border-danger focus:ring-danger/25 focus:border-danger"
                    : "border-line-strong focus:ring-accent/25 focus:border-accent"
                }`}
              />
              {duplicateClient && (
                <p className="text-xs text-danger mt-1">
                  No. HP ini sudah dipakai oleh client &ldquo;{duplicateClient.name}&rdquo;
                </p>
              )}
            </div>
            <div>
              <label htmlFor="client-form-modal-alamat" className="block text-sm font-medium text-ink mb-1">Alamat</label>
              <input id="client-form-modal-alamat" name="address" value={form.address || ""} onChange={handleChange} className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink focus:ring-2 focus:ring-accent/25 focus:border-accent outline-none" />
            </div>
            <div>
              <label htmlFor="client-form-modal-nama-proyek" className="block text-sm font-medium text-ink mb-1">Nama Proyek</label>
              <input id="client-form-modal-nama-proyek" name="project_name" value={form.project_name || ""} onChange={handleChange} className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink focus:ring-2 focus:ring-accent/25 focus:border-accent outline-none" />
            </div>
            <div>
              <label htmlFor="client-form-modal-tipe-properti" className="block text-sm font-medium text-ink mb-1">Tipe Properti</label>
              <Select id="client-form-modal-tipe-properti"
                value={form.property_type || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, property_type: v }))}
                options={toOptions(PROPERTY_TYPES)}
                placeholder="Pilih tipe"
              />
            </div>
            <div>
              <label htmlFor="client-form-modal-budget" className="block text-sm font-medium text-ink mb-1">Budget</label>
              <Select id="client-form-modal-budget"
                value={form.budget_range || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, budget_range: v }))}
                options={toOptions(BUDGET_RANGES)}
                placeholder="Pilih budget"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Status Lead</label>
              {form.lead_status ? (
                <div className="flex items-center h-[38px]">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${CLIENT_LEAD_STATUS_COLORS[form.lead_status] || "tone-neutral"}`}>
                    {form.lead_status}
                  </span>
                </div>
              ) : (
                <div className="flex items-center h-[38px] text-sm text-faint">Belum ada lead</div>
              )}
              <p className="text-xs text-faint mt-1">Otomatis mengikuti status Lead terbaru, tidak bisa diedit manual.</p>
            </div>
            <div>
              <label htmlFor="client-form-modal-sumber" className="block text-sm font-medium text-ink mb-1">Sumber</label>
              <Select id="client-form-modal-sumber"
                value={form.source || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, source: v }))}
                options={toOptions(SOURCES)}
                placeholder="Pilih sumber"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Prioritas</label>
              {form.priority ? (
                <div className="flex items-center h-[38px]">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[form.priority] || "tone-neutral"}`}>
                    {form.priority}
                  </span>
                </div>
              ) : (
                <div className="flex items-center h-[38px] text-sm text-faint">Belum ada lead</div>
              )}
              <p className="text-xs text-faint mt-1">Otomatis mengikuti priority Lead terbaru, tidak bisa diedit manual.</p>
            </div>
          </div>
          <div>
            <label htmlFor="client-form-modal-catatan" className="block text-sm font-medium text-ink mb-1">Catatan</label>
            <textarea id="client-form-modal-catatan" name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tambahan..." className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink focus:ring-2 focus:ring-accent/25 focus:border-accent outline-none resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !!duplicateClient}
              className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Client"}
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
