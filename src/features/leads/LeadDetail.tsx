"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { useRabList } from "@/hooks/useRab";
import { useInvoices } from "@/hooks/useInvoices";
import { useLeadContacts } from "@/hooks/useLeadContacts";
import { useLeadProducts, useProducts } from "@/hooks/useProducts";
import { setLeadProductDibeli } from "@/services/products";
import { addRab, deleteRab, duplicateRab, updateRab } from "@/services/rab";
import { addLeadContact } from "@/services/leadContacts";
import { updateLead } from "@/services/leads";
import { useToast } from "@/components/Toast";
import { useState } from "react";
import { Rab, RabOpsi, LeadContactChannel, LeadContactHasil } from "@/types/db";
import { LEAD_CONTACT_CHANNELS, LEAD_CONTACT_CHANNEL_LABELS, LEAD_CONTACT_HASIL_LABELS, RAB_OPSI } from "@/constants/options";
import { LeadFormModal } from "./LeadFormModal";
import { ActionDropdown } from "@/components/ActionDropdown";
import { DetailTabs, useTabParam } from "@/components/DetailTabs";
import { StatusDot, LEAD_STATUS_TONE } from "@/components/ui/StatusDot";
import { formatIDR, formatDate } from "@/utils/format";
import { useConfirm } from "@/components/ConfirmProvider";


const formatCurrency = (n?: number) =>
  n == null ? "—" : formatIDR(n);

const TAB_KEYS = ["ringkasan", "kontak", "rab"] as const;
const LEAD_STAGES = ["New Lead", "Contacted", "Survey", "Deal", "Deal Won"] as const;

const rabStatusColors: Record<string, string> = {
  draft: "tone-neutral",
  sent: "tone-active",
  approved: "tone-success",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-faint mb-0.5">{label}</p>
      <p className="text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

export default function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { leads, loading: ll, error: leadsError, refetch: refetchLeads } = useLeads();
  const { clients, loading: lc } = useClients();
  const { rabList, loading: lr, refetch: refetchRab } = useRabList(leadId);
  const { invoices } = useInvoices();
  const { contacts, refetch: refetchContacts } = useLeadContacts(leadId);
  const { products } = useProducts();
  const { leadProducts, refetch: refetchLeadProducts } = useLeadProducts(leadId);

  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, "ringkasan");
  const [editOpen, setEditOpen] = useState(false);
  const [showAddRab, setShowAddRab] = useState(false);
  const [newRabNama, setNewRabNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [contactChannel, setContactChannel] = useState<LeadContactChannel>("call");
  const [contactHasil, setContactHasil] = useState<LeadContactHasil>("direspons");
  const [contactNextFollowUp, setContactNextFollowUp] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const loading = ll || lc;

  if (loading || lr) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-line border-t-ink" />
      </div>
    );
  }

  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition mb-6">
          <span>←</span> Kembali
        </button>
        <div className="bg-white rounded-md border border-line p-12 text-center">
          <p className="text-faint text-sm">{leadsError ? 'Data gagal dimuat. Tekan "Coba lagi" di atas.' : "Lead tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === lead.client_id);

  async function handleAddRab() {
    if (!newRabNama.trim()) return;
    setSaving(true);
    try {
      await addRab(leadId, newRabNama.trim());
      await refetchRab();
      setNewRabNama("");
      setShowAddRab(false);
      toast("RAB berhasil dibuat", "success");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      toast(`Gagal membuat RAB: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  }

  function isRabLunas(rabId: string) {
    const rabInvoices = (invoices ?? []).filter((inv) => inv.rab_id === rabId);
    return rabInvoices.length > 0 && rabInvoices.every((inv) => inv.status === "paid");
  }

  async function handleDeleteRab(id: string) {
    if (isRabLunas(id)) {
      toast("RAB sudah lunas dan tidak dapat dihapus", "warning");
      return;
    }
    if (!(await confirm({ title: "Hapus RAB?", description: "RAB beserta semua pekerjaan dan itemnya akan dihapus permanen." }))) return;
    setDeletingId(id);
    try {
      await deleteRab(id);
      await refetchRab();
      toast("RAB dihapus", "success");
    } catch {
      toast("Gagal menghapus RAB", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicateRab(id: string) {
    setDuplicatingId(id);
    try {
      await duplicateRab(id);
      await refetchRab();
      toast("RAB berhasil diduplikasi", "success");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      toast(`Gagal menduplikasi RAB: ${msg}`, "error");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDibeliChange(productId: string, dibeli: boolean) {
    try {
      await setLeadProductDibeli(leadId, productId, dibeli);
      await refetchLeadProducts();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      toast(`Gagal memperbarui produk: ${msg}`, "error");
    }
  }

  async function handleNoResponseChange(delta: 1 | -1) {
    if (!lead) return;
    const next = Math.max(0, (lead.no_response_count ?? 0) + delta);
    try {
      await updateLead(lead.id, { no_response_count: next });
      await refetchLeads();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      toast(`Gagal update No Response Count: ${msg}`, "error");
    }
  }

  async function handleAddContact() {
    setSavingContact(true);
    try {
      await addLeadContact({
        lead_id: leadId,
        channel: contactChannel,
        hasil: contactHasil,
        next_follow_up: contactNextFollowUp || undefined,
        notes: contactNotes.trim() || undefined,
      });
      await Promise.all([refetchContacts(), refetchLeads()]);
      setContactNotes("");
      setContactNextFollowUp("");
      setContactHasil("direspons");
      toast("Interaksi dicatat", "success");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      toast(`Gagal mencatat interaksi: ${msg}`, "error");
    } finally {
      setSavingContact(false);
    }
  }

  async function handleStatusChange(rab: Rab, status: Rab["status"]) {
    if (isRabLunas(rab.id)) {
      toast("RAB sudah lunas dan tidak dapat diubah", "warning");
      return;
    }
    try {
      await updateRab(rab.id, { status });
      await Promise.all([refetchRab(), refetchLeads()]);
      toast("Status RAB diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  async function handleOpsiChange(rab: Rab, opsi: RabOpsi | null) {
    try {
      await updateRab(rab.id, { opsi: opsi as RabOpsi | undefined });
      await refetchRab();
    } catch {
      toast("Gagal memperbarui opsi SPH", "error");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink truncate">{client?.name ?? "Unknown Client"}</h1>
            {lead.project_name && <p className="text-[13px] text-muted mt-0.5">{lead.project_name}</p>}
          </div>
          {lead.status === "Deal Won" && (
            <Link
              href={`/projects?client_id=${lead.client_id}&lead_id=${leadId}`}
              className="self-start px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors shrink-0"
            >
              + Buat Project
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted">
          <StatusDot tone={LEAD_STATUS_TONE[lead.status] ?? "neutral"}>{lead.status}</StatusDot>
          {lead.is_stale && (
            <span title="Contacted > 7 hari tanpa kontak terbaru" className="text-warning font-medium">Stale</span>
          )}
          {lead.priority && <span>Prioritas <span className="text-ink font-medium capitalize">{lead.priority}</span></span>}
          {lead.source && <span>Sumber <span className="text-ink font-medium">{lead.source}</span></span>}
          {lead.assigned_to && <span>PIC <span className="text-ink font-medium">{lead.assigned_to}</span></span>}
          {lead.follow_up_date && <span className="tabular-nums">Follow-up <span className="text-ink font-medium">{formatDate(lead.follow_up_date)}</span></span>}
        </div>
        {lead.status === "Deal Lost" ? (
          <p className="text-xs text-danger">Lead ditutup sebagai Deal Lost{lead.alasan_lost ? ` · ${lead.alasan_lost}` : ""}</p>
        ) : (
          <ol className="grid grid-cols-5 gap-1 pt-1" aria-label="Tahapan lead">
            {LEAD_STAGES.map((stage, i) => {
              const current = LEAD_STAGES.indexOf(lead.status as (typeof LEAD_STAGES)[number]);
              const done = i < current || lead.status === "Deal Won";
              const now = i === current && lead.status !== "Deal Won";
              return (
                <li key={stage} className={`grid gap-1.5 text-xs ${done || now ? "text-ink" : "text-faint"} ${now ? "font-medium" : ""}`}>
                  <span className={`h-[3px] rounded-full ${done ? "bg-ink" : now ? "bg-accent" : "bg-line"}`} />
                  <span className="truncate">{stage}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Angka utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-line -mx-4 sm:-mx-6 lg:-mx-8 [&>div]:px-4 sm:[&>div]:px-6 lg:[&>div]:px-8">
        <div className="py-3 border-r border-line">
          <p className="text-xs text-muted">RAB</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{rabList.length}</p>
        </div>
        <div className="py-3 lg:border-r border-line">
          <p className="text-xs text-muted">RAB disetujui</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{rabList.filter((r) => r.status === "approved").length}</p>
        </div>
        <div className="py-3 border-r border-t lg:border-t-0 border-line">
          <p className="text-xs text-muted">Budget klien</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{formatCurrency(lead.budget)}</p>
        </div>
        <div className="py-3 border-t lg:border-t-0 border-line">
          <p className="text-xs text-muted">Nominal deal</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{formatCurrency(lead.nominal_deal)}</p>
        </div>
      </div>

      {editOpen && (
        <LeadFormModal
          lead={lead}
          clients={clients}
          onSaved={() => { setEditOpen(false); refetchLeads(); }}
          onClose={() => setEditOpen(false)}
        />
      )}

      <DetailTabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan" },
          { key: "kontak", label: "Log Kontak", count: contacts.length },
          { key: "rab", label: "RAB", count: rabList.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "ringkasan" && (<>
      {/* Informasi Lead */}
      <div className="bg-white rounded-md border border-line p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Informasi Lead</h2>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent-soft rounded-md hover:bg-accent-soft transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoRow label="Klien" value={client?.name} />
          <InfoRow label="No. HP" value={client?.phone} />
          <InfoRow label="Sumber" value={lead.source} />
          {lead.source === "Referral" && <InfoRow label="Direkomendasikan oleh" value={lead.referred_by} />}
          <InfoRow label="Segmen" value={lead.segmen} />
          <InfoRow label="Area" value={lead.area} />
          <InfoRow label="Status" value={lead.status} />
          <InfoRow label="Prioritas" value={lead.priority} />
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">No Response Count</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink">{lead.no_response_count ?? 0}</span>
              <button
                onClick={() => handleNoResponseChange(1)}
                title="Tandai follow-up tanpa respon (+1)"
                className="w-5 h-5 flex items-center justify-center rounded bg-hover text-muted hover:bg-hover text-xs leading-none"
              >+</button>
              <button
                onClick={() => handleNoResponseChange(-1)}
                title="Kurangi (mis. client akhirnya merespon)"
                disabled={(lead.no_response_count ?? 0) === 0}
                className="w-5 h-5 flex items-center justify-center rounded bg-hover text-muted hover:bg-hover text-xs leading-none disabled:opacity-40 disabled:cursor-not-allowed"
              >−</button>
            </div>
          </div>
          <InfoRow label="Ditugaskan ke" value={lead.assigned_to} />
          <InfoRow label="Follow-up" value={formatDate(lead.follow_up_date)} />
          <InfoRow label="Kontak terakhir" value={formatDate(lead.last_contacted_at)} />
          <InfoRow label="Ditutup" value={formatDate(lead.closed_at)} />
          <InfoRow label="Tanggal Survey" value={formatDate(lead.survey_date)} />
          <InfoRow label="Lokasi Survey" value={lead.lokasi_survey} />
          <InfoRow label="Budget" value={formatCurrency(lead.budget)} />
          <InfoRow label="Nominal Deal" value={formatCurrency(lead.nominal_deal)} />
          {lead.status === "Deal Lost" && <InfoRow label="Alasan Lost" value={lead.alasan_lost} />}
        </div>
        {lead.notes && (
          <div className="pt-5 border-t border-line">
            <p className="text-xs font-medium text-faint mb-1">Catatan</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Produk — "dibeli" baru relevan setelah Deal Won */}
      <div className="bg-white rounded-md border border-line p-6 space-y-3">
        <h2 className="text-sm font-semibold text-ink">Produk</h2>
        {leadProducts.length === 0 ? (
          <p className="text-sm text-faint">Belum ada produk dipilih. Tambahkan lewat tombol Edit.</p>
        ) : (
          <ul className="divide-y divide-line">
            {leadProducts.map((row) => {
              const product = products.find((p) => p.id === row.product_id);
              return (
                <li key={row.product_id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="min-w-0">
                    <span className="text-ink font-medium">{product?.nama ?? "—"}</span>
                    {product?.kategori && <span className="text-xs text-faint"> · {product.kategori}</span>}
                  </span>
                  {lead.status === "Deal Won" ? (
                    <label className="flex items-center gap-2 text-xs text-muted cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={row.dibeli}
                        onChange={(e) => handleDibeliChange(row.product_id, e.target.checked)}
                        className="accent-accent"
                      />
                      Dibeli
                    </label>
                  ) : (
                    <span className="text-xs text-muted shrink-0">Diminati</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ActivityTimeline entityType="lead" entityId={leadId} />
      </>)}

      {/* Log Kontak — syarat New Lead → Contacted: minimal 1 record */}
      {activeTab === "kontak" && (
      <div className="space-y-4">
        <div className="bg-white rounded-md border border-line p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label htmlFor="lead-contact-channel" className="block text-xs font-medium text-muted mb-1">Kanal</label>
              <select
                id="lead-contact-channel"
                value={contactChannel}
                onChange={(e) => setContactChannel(e.target.value as LeadContactChannel)}
                className="w-full border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                {LEAD_CONTACT_CHANNELS.map((c) => (
                  <option key={c} value={c}>{LEAD_CONTACT_CHANNEL_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-contact-hasil" className="block text-xs font-medium text-muted mb-1">Hasil</label>
              <select
                id="lead-contact-hasil"
                value={contactHasil}
                onChange={(e) => setContactHasil(e.target.value as LeadContactHasil)}
                className="w-full border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
              >
                {Object.entries(LEAD_CONTACT_HASIL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lead-contact-next" className="block text-xs font-medium text-muted mb-1">Follow-up berikutnya</label>
              <input
                id="lead-contact-next"
                type="date"
                value={contactNextFollowUp}
                onChange={(e) => setContactNextFollowUp(e.target.value)}
                className="w-full border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Catatan interaksi (opsional)"
              aria-label="Catatan interaksi"
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              className="flex-1 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <button
              onClick={handleAddContact}
              disabled={savingContact}
              className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover disabled:opacity-50 transition shrink-0"
            >
              {savingContact ? "Menyimpan..." : "Catat Interaksi"}
            </button>
          </div>
          {contactHasil === "tidak_direspons" && (lead.no_response_count ?? 0) >= 2 && lead.status !== "Deal Won" && lead.status !== "Deal Lost" && (
            <p className="text-xs text-warning">Ini tanpa respons ke-3, lead otomatis jadi Deal Lost pada pengecekan harian berikutnya.</p>
          )}
          {contacts.length === 0 ? (
            <p className="text-sm text-faint">Belum ada kontak tercatat. Wajib ada minimal 1 sebelum status bisa pindah ke Contacted.</p>
          ) : (
            <div className="divide-y divide-line">
              {contacts.map((c) => (
                <div key={c.id} className="py-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs px-2 py-0.5 rounded-md border border-line text-muted">
                        {LEAD_CONTACT_CHANNEL_LABELS[c.channel]}
                      </span>
                      {c.hasil && <span className="text-xs text-muted">{LEAD_CONTACT_HASIL_LABELS[c.hasil]}</span>}
                      {c.next_follow_up && <span className="text-xs text-muted">Follow-up {formatDate(c.next_follow_up)}</span>}
                    </div>
                    {c.notes && <p className="text-sm text-ink mt-1">{c.notes}</p>}
                  </div>
                  <p className="text-xs text-faint shrink-0">{formatDate(c.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* RAB */}
      {activeTab === "rab" && (
      <div className="space-y-4">
        {/* Add RAB */}
        <div className="bg-white rounded-md border border-line p-4">
          {showAddRab ? (
            <div className="flex items-center gap-3">
              <input
                autoFocus
                type="text"
                placeholder="Nama RAB, misal: RAB V1"
                value={newRabNama}
                onChange={(e) => setNewRabNama(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRab()}
                className="flex-1 border border-line rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-transparent"
              />
              <button
                onClick={handleAddRab}
                disabled={saving || !newRabNama.trim()}
                className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover disabled:opacity-50 transition"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => { setShowAddRab(false); setNewRabNama(""); }}
                className="px-4 py-2 text-sm text-muted hover:text-ink transition"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRab(true)}
              className="flex items-center gap-2 text-sm text-muted hover:text-ink transition"
            >
              <span className="text-lg leading-none">+</span> Buat RAB Baru
            </button>
          )}
        </div>

        {/* RAB list */}
        {rabList.length === 0 ? (
          <div className="bg-white rounded-md border border-line p-12 text-center">
            <p className="text-faint text-sm">Belum ada RAB untuk lead ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rabList.map((rab) => {
              const lunas = isRabLunas(rab.id);
              return (
              <div key={rab.id} className="bg-white rounded-md border border-line p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink truncate">{rab.nama}</p>
                    {lunas && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full tone-success shrink-0">
                        ✓ Lunas
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-faint mt-0.5">
                    Dibuat {formatDate(rab.created_at)}
                    {rab.sent_at && ` · SPH dikirim ${formatDate(rab.sent_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <select
                    aria-label={`Opsi SPH ${rab.nama}`}
                    value={rab.opsi ?? ""}
                    onChange={(e) => handleOpsiChange(rab, (e.target.value || null) as RabOpsi | null)}
                    className="text-xs text-muted border border-line rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent/25"
                  >
                    <option value="">Tanpa opsi</option>
                    {RAB_OPSI.map((opsi) => (
                      <option key={opsi} value={opsi}>{opsi}</option>
                    ))}
                  </select>
                  <select
                    value={rab.status}
                    onChange={(e) => handleStatusChange(rab, e.target.value as Rab["status"])}
                    disabled={lunas}
                    title={lunas ? "RAB sudah lunas, status tidak dapat diubah" : undefined}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-70 ${rabStatusColors[rab.status]}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Terkirim</option>
                    <option value="approved">Disetujui</option>
                  </select>
                  <Link
                    href={`/leads/${leadId}/rab/${rab.id}`}
                    className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition"
                  >
                    Buka
                  </Link>

                  {/* Desktop: Duplikasi & Hapus sebagai tombol terpisah */}
                  <button
                    onClick={() => handleDuplicateRab(rab.id)}
                    disabled={duplicatingId === rab.id}
                    title="Duplikasi RAB (untuk membuat penawaran harga alternatif dengan komponen yang sama)"
                    className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-muted border border-line rounded-md hover:bg-hover hover:text-ink transition disabled:opacity-50"
                  >
                    {duplicatingId === rab.id ? "..." : "Duplikasi"}
                  </button>
                  <button
                    onClick={() => handleDeleteRab(rab.id)}
                    disabled={deletingId === rab.id || lunas}
                    title={lunas ? "RAB sudah lunas dan tidak dapat dihapus" : undefined}
                    className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-danger hover:text-danger hover:bg-danger-soft rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    {deletingId === rab.id ? "..." : "Hapus"}
                  </button>

                  {/* Mobile: Duplikasi & Hapus digabung jadi satu dropdown biar tidak sesak */}
                  <div className="sm:hidden">
                    <ActionDropdown
                      align="right"
                      label="⋯"
                      buttonClassName="px-2.5 py-1.5 text-sm font-medium text-muted border border-line rounded-md hover:bg-hover hover:text-ink transition"
                      items={[
                        {
                          key: "duplicate",
                          label: duplicatingId === rab.id ? "Menduplikasi..." : "Duplikasi",
                          disabled: duplicatingId === rab.id,
                          onClick: () => handleDuplicateRab(rab.id),
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          ),
                        },
                        {
                          key: "delete",
                          label: deletingId === rab.id ? "Menghapus..." : "Hapus",
                          disabled: deletingId === rab.id || lunas,
                          danger: true,
                          onClick: () => handleDeleteRab(rab.id),
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          ),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
