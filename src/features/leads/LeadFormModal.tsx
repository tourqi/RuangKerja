"use client";
import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from "react";
import { Lead, LeadStatus, Client } from "@/types/db";
import { addLead, updateLead } from "@/services/leads";
import { useToast } from "@/components/Toast";
import {
  LEAD_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  SOURCES,
} from "@/constants/options";

type Props = {
  lead?: Lead | null;
  clients: Client[];
  preselectedClientId?: string | null;
  onSaved: () => void;
  onClose: () => void;
  onSavedAndAddProject?: (lead: Lead) => void;
};

const LEAD_COLUMNS: (keyof Lead)[] = [
  "client_id", "status", "priority", "source", "project_name",
  "follow_up_date", "last_contacted_at", "closed_at", "notes",
];

export function LeadFormModal({ lead, clients, preselectedClientId, onSaved, onClose, onSavedAndAddProject }: Props) {
  const toast = useToast();
  const isEditing = !!lead;

  const [form, setForm] = useState<Partial<Lead>>(lead ?? { status: "New Lead" });
  const [saving, setSaving] = useState(false);
  const [savedLead, setSavedLead] = useState<Lead | null>(null);
  const [clientQuery, setClientQuery] = useState(() => {
    if (!lead?.client_id) return "";
    const c = clients.find((cl) => cl.id === lead.client_id);
    return c ? c.name + (c.phone ? ` (${c.phone})` : "") : "";
  });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!preselectedClientId || isEditing) return;
    const c = clients.find((cl) => cl.id === preselectedClientId);
    if (!c) return;
    setForm((prev) => ({ ...prev, client_id: c.id, source: c.source || prev.source }));
    setClientQuery(c.name + (c.phone ? ` (${c.phone})` : ""));
  }, [preselectedClientId, clients, isEditing]);

  const filteredClients = clientQuery
    ? clients.filter((c) => {
        const digits = clientQuery.replace(/\D/g, "");
        return (
          c.name?.toLowerCase().includes(clientQuery.toLowerCase()) ||
          (digits.length > 0 && c.phone?.replace(/\D/g, "").includes(digits))
        );
      })
    : clients;

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.client_id) {
      toast("Pilih client terlebih dahulu", "warning");
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        const payload = Object.fromEntries(
          LEAD_COLUMNS
            .filter((k) => form[k] !== undefined)
            .map((k) => [k, form[k] === "" ? null : form[k]])
        ) as Partial<Lead>;
        payload.status = (form.status || "New Lead") as LeadStatus;
        await updateLead(lead.id, payload);
        toast("Lead berhasil diperbarui", "success");
        onSaved();
      } else {
        const payload = Object.fromEntries(
          LEAD_COLUMNS
            .filter((k) => form[k] !== undefined && form[k] !== "")
            .map((k) => [k, form[k]])
        ) as Omit<Lead, "id" | "created_at">;
        payload.status = (form.status || "New Lead") as LeadStatus;
        const newLead = await addLead(payload);
        toast("Lead berhasil ditambahkan", "success");
        if (onSavedAndAddProject) {
          setSavedLead(newLead);
        } else {
          onSaved();
        }
      }
    } catch (err: unknown) {
      const pg = err as { message?: string };
      toast(`Gagal ${isEditing ? "update" : "menambah"} lead: ${pg?.message || "Terjadi kesalahan"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (savedLead && onSavedAndAddProject) {
    const client = clients.find((c) => c.id === savedLead.client_id);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Lead berhasil ditambahkan!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Ingin langsung menambahkan data <span className="font-medium text-gray-700">project</span>{client ? <> untuk <span className="font-medium text-gray-700">{client.name}</span></> : ""}?
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
              onClick={() => onSavedAndAddProject(savedLead)}
            >
              Ya, Input Data Project
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Lead" : "Tambah Lead Baru"}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            onClick={handleClose}
          >✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Client Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={clientQuery}
              onChange={(e) => {
                setClientQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Cari nama/telepon client"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
              autoComplete="off"
            />
            {showDropdown && clientQuery && (
              <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow max-h-48 overflow-y-auto">
                {filteredClients.length === 0 && (
                  <div className="px-3 py-2 text-gray-400 text-sm">Tidak ditemukan</div>
                )}
                {filteredClients.map((c) => (
                  <div
                    key={c.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm ${form.client_id === c.id ? "bg-purple-100" : ""}`}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, client_id: c.id, source: c.source || prev.source }));
                      setClientQuery(c.name + (c.phone ? ` (${c.phone})` : ""));
                      setShowDropdown(false);
                    }}
                  >
                    {c.name} {c.phone && <span className="text-xs text-gray-400">({c.phone})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Nama Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project</label>
            <input
              type="text"
              name="project_name"
              value={form.project_name || ""}
              onChange={handleChange}
              placeholder="Nama project untuk lead ini"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
            <select name="status" value={form.status || "New Lead"} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500">
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" value={form.priority || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Pilih Prioritas</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
          {/* Source (auto-filled from client) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
            <select name="source" value={form.source || ""} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-900">
              <option value="">Pilih Source</option>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
              <input type="date" name="follow_up_date" value={form.follow_up_date || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Contacted At</label>
              <input type="date" name="last_contacted_at" value={form.last_contacted_at || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closed At</label>
              <input type="date" name="closed_at" value={form.closed_at || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tentang lead ini..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50">
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Lead"}
            </button>
            <button type="button" className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition" onClick={handleClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
