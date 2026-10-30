"use client";
import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from "react";
import { Lead, LeadStatus, Client } from "@/types/db";
import { addLead, updateLead } from "@/services/leads";
import { useToast } from "@/components/Toast";
import { Select } from "@/components/Select";
import { NumberInput } from "@/components/NumberInput";
import { useRabList } from "@/hooks/useRab";
import { useLeadProducts, useProducts } from "@/hooks/useProducts";
import { setLeadProducts } from "@/services/products";
import { ProductPicker } from "@/features/products/ProductPicker";
import { formatRupiah } from "@/utils/format";
import { getStatusTransitionError, FOLLOW_UP_REQUIRED_STATUSES } from "@/utils/leadStatusGuard";
import {
  LEAD_AREAS,
  LEAD_SEGMEN,
  LEAD_STATUSES,
  LOST_REASONS,
  PRIORITY_COLORS,
  REFERRAL_ASK,
  SOURCES,
  toOptions,
} from "@/constants/options";
import { DialogA11y } from "@/components/DialogA11y";

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
  "segmen", "area", "referred_by", "survey_date",
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
  const { products } = useProducts();
  const { leadProducts, refetch: refetchLeadProducts } = useLeadProducts(lead?.id ?? "");
  // null = belum disentuh user, jadi data lead_products tidak ikut ditulis ulang.
  const [pickedProductIds, setPickedProductIds] = useState<string[] | null>(null);

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

  // Lead sudah tersimpan di titik ini, jadi kegagalan di sini tidak boleh
  // terbaca sebagai gagal simpan lead (submit ulang akan membuat lead ganda).
  const saveLeadProducts = async (leadId: string) => {
    if (pickedProductIds === null) return;
    try {
      await setLeadProducts(leadId, pickedProductIds, form.status === "Deal Won");
      await refetchLeadProducts();
    } catch (err: unknown) {
      const pg = err as { message?: string };
      toast(`Lead tersimpan, tapi produk gagal disimpan: ${pg?.message || "periksa koneksi"}. Pilih ulang lewat Edit Lead.`, "error");
    }
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
        await saveLeadProducts(lead.id);
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
        await saveLeadProducts(newLead.id);
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
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-8 text-center">
          <DialogA11y onClose={onClose} />
          <div className="w-14 h-14 bg-success-soft rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-ink mb-1">Lead berhasil ditambahkan!</h3>
          <p className="text-sm text-muted mb-6">
            Ingin langsung menambahkan data <span className="font-medium text-ink">project</span>{client ? <> untuk <span className="font-medium text-ink">{client.name}</span></> : ""}?
          </p>
          <div className="flex flex-col gap-2">
            <button
              className="w-full px-4 py-2.5 bg-success text-white text-sm font-medium rounded-md hover:bg-success/90 transition"
              onClick={() => onSavedAndAddProject(savedLead)}
            >
              Ya, Input Data Project
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
            {isEditing ? "Edit Lead" : "Tambah Lead Baru"}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition"
            onClick={handleClose}
          >✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Autocomplete */}
            <div className="relative sm:col-span-2">
              <label htmlFor="lead-form-modal-client" className="block text-sm font-medium text-ink mb-1">Klien <span className="text-danger">*</span></label>
              <input id="lead-form-modal-client"
                type="text"
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Cari nama/telepon client"
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                autoComplete="off"
              />
              {showDropdown && clientQuery && (
                <div className="absolute z-10 left-0 right-0 bg-white border border-line rounded-b-lg shadow max-h-48 overflow-y-auto">
                  {filteredClients.length === 0 && (
                    <div className="px-3 py-2 text-faint text-sm">Tidak ditemukan</div>
                  )}
                  {filteredClients.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      className={`block w-full text-left px-3 py-2 cursor-pointer hover:bg-accent-soft focus-visible:bg-accent-soft text-sm text-ink ${form.client_id === c.id ? "bg-accent-soft" : ""}`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, client_id: c.id, source: c.source || prev.source }));
                        setClientQuery(c.name + (c.phone ? ` (${c.phone})` : ""));
                        setShowDropdown(false);
                      }}
                    >
                      {c.name} {c.phone && <span className="text-xs text-faint">({c.phone})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Nama Project */}
            <div>
              <label htmlFor="lead-form-modal-nama-proyek" className="block text-sm font-medium text-ink mb-1">Nama Proyek</label>
              <input id="lead-form-modal-nama-proyek"
                type="text"
                name="project_name"
                value={form.project_name || ""}
                onChange={handleChange}
                placeholder="Nama project untuk lead ini"
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
              />
              <p className="text-xs text-faint mt-1">Wajib diisi (bersama Budget) untuk pindah ke status Deal.</p>
            </div>
            {/* Status */}
            <div>
              <label htmlFor="lead-form-modal-status" className="block text-sm font-medium text-ink mb-1">Status <span className="text-danger">*</span></label>
              <Select id="lead-form-modal-status"
                value={form.status || "New Lead"}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v as LeadStatus }))}
                options={toOptions(LEAD_STATUSES)}
                includeEmptyOption={false}
              />
            </div>
            {/* Produk — boleh lebih dari satu */}
            <div className="sm:col-span-2">
              <label htmlFor="lead-form-modal-produk" className="block text-sm font-medium text-ink mb-1">Produk Diminati</label>
              <ProductPicker
                id="lead-form-modal-produk"
                products={products}
                value={pickedProductIds ?? leadProducts.map((row) => row.product_id)}
                onChange={setPickedProductIds}
              />
            </div>
            {/* Lokasi Survey — syarat Contacted → Survey */}
            <div>
              <label htmlFor="lead-form-modal-lokasi-survey" className="block text-sm font-medium text-ink mb-1">Lokasi Survey</label>
              <input id="lead-form-modal-lokasi-survey"
                type="text"
                name="lokasi_survey"
                value={form.lokasi_survey || ""}
                onChange={handleChange}
                placeholder="Alamat lokasi survey"
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
              />
              <p className="text-xs text-faint mt-1">Wajib diisi untuk pindah ke status Survey.</p>
            </div>
            {/* Source — default dari client, bisa beda per lead (mis. Klien Lama) */}
            <div>
              <label htmlFor="lead-form-modal-sumber" className="block text-sm font-medium text-ink mb-1">Sumber</label>
              <Select id="lead-form-modal-sumber"
                value={form.source || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, source: v, referred_by: v === "Referral" ? prev.referred_by : "" }))}
                options={toOptions(SOURCES)}
                placeholder="Pilih sumber"
              />
            </div>
            {form.source === "Referral" && (
              <div>
                <label htmlFor="lead-form-modal-referred-by" className="block text-sm font-medium text-ink mb-1">Direkomendasikan oleh</label>
                <input id="lead-form-modal-referred-by"
                  type="text"
                  name="referred_by"
                  list="lead-form-modal-referred-by-options"
                  value={form.referred_by || ""}
                  onChange={handleChange}
                  placeholder="Nama teman atau PT ASK"
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                />
                <datalist id="lead-form-modal-referred-by-options">
                  <option value={REFERRAL_ASK} />
                </datalist>
              </div>
            )}
            {/* Segmen */}
            <div>
              <label htmlFor="lead-form-modal-segmen" className="block text-sm font-medium text-ink mb-1">Segmen</label>
              <Select id="lead-form-modal-segmen"
                value={form.segmen || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, segmen: v }))}
                options={toOptions(LEAD_SEGMEN)}
                placeholder="Pilih segmen"
              />
            </div>
            {/* Area */}
            <div>
              <label htmlFor="lead-form-modal-area" className="block text-sm font-medium text-ink mb-1">Area</label>
              <Select id="lead-form-modal-area"
                value={form.area || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, area: v }))}
                options={toOptions(LEAD_AREAS)}
                placeholder="Pilih area"
              />
            </div>
            {/* Budget */}
            <div>
              <label htmlFor="lead-form-modal-budget" className="block text-sm font-medium text-ink mb-1">Budget</label>
              <NumberInput id="lead-form-modal-budget"
                value={form.budget}
                onValueChange={(digits) => setForm((prev) => ({ ...prev, budget: digits ? Number(digits) : undefined }))}
                placeholder="Rp"
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
              />
              <p className="text-xs text-faint mt-1">Wajib diisi untuk pindah ke status Deal.</p>
            </div>
            {/* Nominal Deal — auto dari RAB approved kalau ada, manual kalau belum */}
            <div>
              <label htmlFor="lead-form-modal-nominal-deal" className="block text-sm font-medium text-ink mb-1">Nominal Deal</label>
              {hasApprovedRab ? (
                <div className="flex items-center h-[38px] text-sm text-ink font-medium">
                  {formatRupiah(form.nominal_deal)}
                </div>
              ) : (
                <NumberInput id="lead-form-modal-nominal-deal"
                  value={form.nominal_deal}
                  onValueChange={(digits) => setForm((prev) => ({ ...prev, nominal_deal: digits ? Number(digits) : undefined }))}
                  placeholder="Rp"
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                />
              )}
              <p className="text-xs text-faint mt-1">
                {hasApprovedRab
                  ? "Angka ini otomatis di-generate dari total RAB yang sudah disetujui, tidak bisa diedit manual."
                  : "Wajib diisi untuk pindah ke status Deal Won. Begitu ada RAB yang disetujui, nilai ini otomatis mengikuti RAB."}
              </p>
            </div>
            {/* Priority — read-only, dihitung otomatis dari budget/source/riwayat/no_response_count */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Prioritas</label>
              {form.priority ? (
                <div className="flex items-center h-[38px]">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[form.priority] || "tone-neutral"}`}>
                    {form.priority}
                  </span>
                </div>
              ) : (
                <div className="flex items-center h-[38px] text-sm text-faint">Dihitung otomatis setelah disimpan</div>
              )}
              <p className="text-xs text-faint mt-1">Otomatis dari budget, source, riwayat Deal Won client, dan No Response Count.</p>
            </div>
            {/* No Response Count — input formula priority (rule #2) */}
            <div>
              <label htmlFor="lead-form-modal-no-response-count" className="block text-sm font-medium text-ink mb-1">Jumlah tanpa respons</label>
              <NumberInput id="lead-form-modal-no-response-count"
                value={form.no_response_count ?? 0}
                onValueChange={(digits) => setForm((prev) => ({ ...prev, no_response_count: digits ? Number(digits) : 0 }))}
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
              />
              <p className="text-xs text-faint mt-1">≥ 2 otomatis membuat Priority jadi Low.</p>
            </div>
            {/* Date Fields */}
            <div>
              <label htmlFor="lead-form-modal-follow-up-date" className="block text-sm font-medium text-ink mb-1">
                Follow Up Date
                {form.status && FOLLOW_UP_REQUIRED_STATUSES.includes(form.status as LeadStatus) && (
                  <span className="text-danger"> *</span>
                )}
              </label>
              <input id="lead-form-modal-follow-up-date" type="date" name="follow_up_date" value={form.follow_up_date || ""} onChange={handleChange} className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
              {form.status && FOLLOW_UP_REQUIRED_STATUSES.includes(form.status as LeadStatus) ? (
                <p className="text-xs text-faint mt-1">Wajib diisi untuk status {form.status}.</p>
              ) : form.status === "Deal Lost" ? (
                <p className="text-xs text-faint mt-1">Opsional — disarankan 3-6 bulan ke depan.</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="lead-form-modal-last-contacted-at" className="block text-sm font-medium text-ink mb-1">Kontak terakhir</label>
              <input id="lead-form-modal-last-contacted-at" type="date" name="last_contacted_at" value={form.last_contacted_at || ""} onChange={handleChange} className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
            </div>
            <div>
              <label htmlFor="lead-form-modal-survey-date" className="block text-sm font-medium text-ink mb-1">Tanggal Survey</label>
              <input id="lead-form-modal-survey-date" type="date" name="survey_date" value={form.survey_date || ""} onChange={handleChange} className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
              <p className="text-xs text-faint mt-1">Otomatis hari ini saat masuk status Survey kalau dikosongkan.</p>
            </div>
            <div>
              <label htmlFor="lead-form-modal-closed-at" className="block text-sm font-medium text-ink mb-1">Tanggal ditutup</label>
              <input id="lead-form-modal-closed-at" type="date" name="closed_at" value={form.closed_at || ""} onChange={handleChange} className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
            </div>
            {/* Alasan Lost — syarat Deal → Deal Lost */}
            <div className="sm:col-span-2">
              <label htmlFor="lead-form-modal-alasan-lost" className="block text-sm font-medium text-ink mb-1">Alasan Lost</label>
              <Select id="lead-form-modal-alasan-lost"
                value={form.alasan_lost || ""}
                onChange={(v) => setForm((prev) => ({ ...prev, alasan_lost: v }))}
                options={toOptions(
                  form.alasan_lost && !(LOST_REASONS as readonly string[]).includes(form.alasan_lost)
                    ? [form.alasan_lost, ...LOST_REASONS]
                    : LOST_REASONS
                )}
                placeholder="Pilih alasan"
              />
              <p className="text-xs text-faint mt-1">Wajib diisi untuk pindah ke status Deal Lost. Detailnya tulis di Catatan.</p>
            </div>
            {/* Notes */}
            <div className="sm:col-span-2">
              <label htmlFor="lead-form-modal-catatan" className="block text-sm font-medium text-ink mb-1">Catatan</label>
              <textarea id="lead-form-modal-catatan" name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tentang lead ini..." className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25 resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50">
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Lead"}
            </button>
            <button type="button" className="px-6 py-2 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition" onClick={handleClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
