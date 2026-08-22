"use client";
import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from "react";
import { Lead, LeadStatus, Client } from "@/types/db";
import { addLead, updateLead } from "@/services/leads";
import { useToast } from "@/components/Toast";
import { Select } from "@/components/Select";
import { NumberInput } from "@/components/NumberInput";
import { useRabList } from "@/hooks/useRab";
import { formatRupiah } from "@/utils/format";
import { getStatusTransitionError, FOLLOW_UP_REQUIRED_STATUSES } from "@/utils/leadStatusGuard";
import {
  LEAD_STATUSES,
  PRIORITY_COLORS,
  SOURCES,
  toOptions,
} from "@/constants/options";

type Props = {
  lead?: Lead | null;
  clients: Client[];
  preselectedClientId?: string | null;
  onSaved: () => void;
  onClose: () => void;
  onSavedAndAddProject?: (lead: Lead) => void;
};

// "priority" SENGAJA tidak ada di sini — dihitung otomatis oleh trigger
// set_lead_priority() di DB, tidak pernah ditulis dari form ini. "nominal_deal"
// ada di sini tapi di-strip kondisional di handleSubmit kalau sudah ada RAB
// approved (di titik itu dia juga auto — lihat trg_sync_lead_nominal_deal_from_rab
// di lead_nominal_deal_from_rab.sql).
const LEAD_COLUMNS: (keyof Lead)[] = [
  "client_id", "status", "source", "project_name",
  "follow_up_date", "last_contacted_at", "closed_at", "notes",
  "lokasi_survey", "budget", "nominal_deal", "alasan_lost", "no_response_count",
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
  const { rabList } = useRabList(lead?.id ?? "");
  const hasApprovedRab = rabList.some((r) => r.status === "approved");

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
    // Guard transisi status (rule #4) — hanya dicek kalau status memang berubah
    // (atau lead baru), sama seperti perilaku trigger DB. Syarat "minimal 1
    // record kontak" untuk New Lead → Contacted tetap diserahkan ke DB guard.
    const statusChanged = !isEditing || form.status !== lead?.status;
    if (statusChanged) {
      const transitionError = getStatusTransitionError(form);
      if (transitionError) {
        toast(transitionError, "warning");
        return;
      }
    }
    setSaving(true);
    try {
      if (isEditing) {
        const columns = hasApprovedRab ? LEAD_COLUMNS.filter((k) => k !== "nominal_deal") : LEAD_COLUMNS;
        const payload = Object.fromEntries(
          columns
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Autocomplete */}
            <div className="relative sm:col-span-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
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
                      className={`px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm text-gray-900 ${form.client_id === c.id ? "bg-purple-100" : ""}`}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Wajib diisi (bersama Budget) untuk pindah ke status Deal.</p>
            </div>
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
              <Select
                value={form.status || "New Lead"}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v as LeadStatus }))}
                options={toOptions(LEAD_STATUSES)}
                includeEmptyOption={false}
              />
            </div>
            {/* Lokasi Survey — syarat Contacted → Survey */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Survey</label>
              <input
                type="text"
                name="lokasi_survey"
                value={form.lokasi_survey || ""}
                onChange={handleChange}
                placeholder="Alamat lokasi survey"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Wajib diisi untuk pindah ke status Survey.</p>
            </div>
            {/* Source (auto-filled from client) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <Select
                value={form.source || ""}
                onChange={() => {}}
                options={toOptions(SOURCES)}
                placeholder="Pilih Source"
                disabled
              />
            </div>
            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
              <NumberInput
                value={form.budget}
                onValueChange={(digits) => setForm((prev) => ({ ...prev, budget: digits ? Number(digits) : undefined }))}
                placeholder="Rp"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Wajib diisi untuk pindah ke status Deal.</p>
            </div>
            {/* Nominal Deal — auto dari RAB approved kalau ada, manual kalau belum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Deal</label>
              {hasApprovedRab ? (
                <div className="flex items-center h-[38px] text-sm text-gray-900 font-medium">
                  {formatRupiah(form.nominal_deal)}
                </div>
              ) : (
                <NumberInput
                  value={form.nominal_deal}
                  onValueChange={(digits) => setForm((prev) => ({ ...prev, nominal_deal: digits ? Number(digits) : undefined }))}
                  placeholder="Rp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">
                {hasApprovedRab
                  ? "Angka ini otomatis di-generate dari total RAB yang sudah disetujui, tidak bisa diedit manual."
                  : "Wajib diisi untuk pindah ke status Deal Won. Begitu ada RAB yang disetujui, nilai ini otomatis mengikuti RAB."}
              </p>
            </div>
            {/* Priority — read-only, dihitung otomatis dari budget/source/riwayat/no_response_count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              {form.priority ? (
                <div className="flex items-center h-[38px]">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[form.priority] || "bg-gray-100 text-gray-600"}`}>
                    {form.priority}
                  </span>
                </div>
              ) : (
                <div className="flex items-center h-[38px] text-sm text-gray-400">Dihitung otomatis setelah disimpan</div>
              )}
              <p className="text-xs text-gray-400 mt-1">Otomatis dari budget, source, riwayat Deal Won client, dan No Response Count.</p>
            </div>
            {/* No Response Count — input formula priority (rule #2) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No Response Count</label>
              <NumberInput
                value={form.no_response_count ?? 0}
                onValueChange={(digits) => setForm((prev) => ({ ...prev, no_response_count: digits ? Number(digits) : 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">≥ 2 otomatis membuat Priority jadi Low.</p>
            </div>
            {/* Date Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Follow Up Date
                {form.status && FOLLOW_UP_REQUIRED_STATUSES.includes(form.status as LeadStatus) && (
                  <span className="text-red-500"> *</span>
                )}
              </label>
              <input type="date" name="follow_up_date" value={form.follow_up_date || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900" />
              {form.status && FOLLOW_UP_REQUIRED_STATUSES.includes(form.status as LeadStatus) ? (
                <p className="text-xs text-gray-400 mt-1">Wajib diisi untuk status {form.status}.</p>
              ) : form.status === "Deal Lost" ? (
                <p className="text-xs text-gray-400 mt-1">Opsional — disarankan 3-6 bulan ke depan.</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Contacted At</label>
              <input type="date" name="last_contacted_at" value={form.last_contacted_at || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closed At</label>
              <input type="date" name="closed_at" value={form.closed_at || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            {/* Alasan Lost — syarat Deal → Deal Lost */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Lost</label>
              <textarea
                name="alasan_lost"
                value={form.alasan_lost || ""}
                onChange={handleChange}
                rows={2}
                placeholder="Alasan lead ini batal/lost..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Wajib diisi untuk pindah ke status Deal Lost.</p>
            </div>
            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
              <textarea name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tentang lead ini..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
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
