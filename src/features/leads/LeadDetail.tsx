"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { useRabList } from "@/hooks/useRab";
import { useInvoices } from "@/hooks/useInvoices";
import { useLeadContacts } from "@/hooks/useLeadContacts";
import { addRab, deleteRab, duplicateRab, updateRab } from "@/services/rab";
import { addLeadContact } from "@/services/leadContacts";
import { updateLead } from "@/services/leads";
import { useToast } from "@/components/Toast";
import { useState } from "react";
import { Rab, LeadContactChannel } from "@/types/db";
import { LEAD_CONTACT_CHANNELS, LEAD_CONTACT_CHANNEL_LABELS } from "@/constants/options";
import { LeadFormModal } from "./LeadFormModal";
import { ActionDropdown } from "@/components/ActionDropdown";

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const formatCurrency = (n?: number) =>
  n == null ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const statusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Survey: "bg-purple-100 text-purple-800",
  Deal: "bg-indigo-100 text-indigo-800",
  "Deal Won": "bg-green-100 text-green-800",
  "Deal Lost": "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const rabStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || "-"}</p>
    </div>
  );
}

export default function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { leads, loading: ll, refetch: refetchLeads } = useLeads();
  const { clients, loading: lc } = useClients();
  const { rabList, loading: lr, refetch: refetchRab } = useRabList(leadId);
  const { invoices } = useInvoices();
  const { contacts, refetch: refetchContacts } = useLeadContacts(leadId);

  const [editOpen, setEditOpen] = useState(false);
  const [showAddRab, setShowAddRab] = useState(false);
  const [newRabNama, setNewRabNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [contactChannel, setContactChannel] = useState<LeadContactChannel>("call");
  const [contactNotes, setContactNotes] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const loading = ll || lc;

  if (loading || lr) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6">
          <span>←</span> Kembali
        </button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Lead tidak ditemukan.</p>
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
      await addLeadContact({ lead_id: leadId, channel: contactChannel, notes: contactNotes.trim() || undefined });
      await refetchContacts();
      setContactNotes("");
      toast("Kontak dicatat", "success");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      toast(`Gagal mencatat kontak: ${msg}`, "error");
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
      await refetchRab();
      toast("Status RAB diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <span>←</span> Kembali ke Leads
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client?.name ?? "Unknown Client"}</h1>
            {lead.project_name && (
              <p className="text-sm text-gray-500 mt-0.5">{lead.project_name}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                {lead.status}
              </span>
              {lead.is_stale && (
                <span title="Contacted > 7 hari tanpa kontak terbaru" className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-200 text-gray-700">
                  Stale
                </span>
              )}
              {lead.priority && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColors[lead.priority] ?? "bg-gray-100 text-gray-600"}`}>
                  {lead.priority}
                </span>
              )}
              {lead.source && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {lead.source}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-4 flex-shrink-0">
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{rabList.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">RAB</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {rabList.filter((r) => r.status === "approved").length}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Disetujui</p>
              </div>
            </div>
            {lead.status === "Deal Won" && (
              <Link
                href={`/projects?client_id=${lead.client_id}&lead_id=${leadId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Buat Project
              </Link>
            )}
          </div>
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

      {/* Informasi Lead */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Informasi Lead</h2>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoRow label="Client" value={client?.name} />
          <InfoRow label="No. HP" value={client?.phone} />
          <InfoRow label="Sumber" value={lead.source} />
          <InfoRow label="Status" value={lead.status} />
          <InfoRow label="Prioritas" value={lead.priority} />
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">No Response Count</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-800">{lead.no_response_count ?? 0}</span>
              <button
                onClick={() => handleNoResponseChange(1)}
                title="Tandai follow-up tanpa respon (+1)"
                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs leading-none"
              >+</button>
              <button
                onClick={() => handleNoResponseChange(-1)}
                title="Kurangi (mis. client akhirnya merespon)"
                disabled={(lead.no_response_count ?? 0) === 0}
                className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs leading-none disabled:opacity-40 disabled:cursor-not-allowed"
              >−</button>
            </div>
          </div>
          <InfoRow label="Ditugaskan ke" value={lead.assigned_to} />
          <InfoRow label="Follow-up" value={formatDate(lead.follow_up_date)} />
          <InfoRow label="Last Contact" value={formatDate(lead.last_contacted_at)} />
          <InfoRow label="Ditutup" value={formatDate(lead.closed_at)} />
          <InfoRow label="Lokasi Survey" value={lead.lokasi_survey} />
          <InfoRow label="Budget" value={formatCurrency(lead.budget)} />
          <InfoRow label="Nominal Deal" value={formatCurrency(lead.nominal_deal)} />
          {lead.status === "Deal Lost" && <InfoRow label="Alasan Lost" value={lead.alasan_lost} />}
        </div>
        {lead.notes && (
          <div className="pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Catatan</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}
      </div>

      {/* Log Kontak — syarat New Lead → Contacted: minimal 1 record */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">
          Log Kontak
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{contacts.length}</span>
        </h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={contactChannel}
              onChange={(e) => setContactChannel(e.target.value as LeadContactChannel)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {LEAD_CONTACT_CHANNELS.map((c) => (
                <option key={c} value={c}>{LEAD_CONTACT_CHANNEL_LABELS[c]}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Catatan kontak (opsional)"
              value={contactNotes}
              onChange={(e) => setContactNotes(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={handleAddContact}
              disabled={savingContact}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition shrink-0"
            >
              {savingContact ? "Menyimpan..." : "Catat Kontak"}
            </button>
          </div>
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada kontak tercatat. Wajib ada minimal 1 sebelum status bisa pindah ke Contacted.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {contacts.map((c) => (
                <div key={c.id} className="py-2 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {LEAD_CONTACT_CHANNEL_LABELS[c.channel]}
                    </span>
                    {c.notes && <p className="text-sm text-gray-700 mt-1">{c.notes}</p>}
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{formatDate(c.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RAB */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">
            RAB
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{rabList.length}</span>
          </h2>
        </div>

        {/* Add RAB */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          {showAddRab ? (
            <div className="flex items-center gap-3">
              <input
                autoFocus
                type="text"
                placeholder="Nama RAB, misal: RAB V1"
                value={newRabNama}
                onChange={(e) => setNewRabNama(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddRab()}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
              <button
                onClick={handleAddRab}
                disabled={saving || !newRabNama.trim()}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => { setShowAddRab(false); setNewRabNama(""); }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddRab(true)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              <span className="text-lg leading-none">+</span> Buat RAB Baru
            </button>
          )}
        </div>

        {/* RAB list */}
        {rabList.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">Belum ada RAB untuk lead ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rabList.map((rab) => {
              const lunas = isRabLunas(rab.id);
              return (
              <div key={rab.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{rab.nama}</p>
                    {lunas && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                        ✓ Lunas
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Dibuat {formatDate(rab.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <select
                    value={rab.status}
                    onChange={(e) => handleStatusChange(rab, e.target.value as Rab["status"])}
                    disabled={lunas}
                    title={lunas ? "RAB sudah lunas, status tidak dapat diubah" : undefined}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-70 ${rabStatusColors[rab.status]}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Terkirim</option>
                    <option value="approved">Disetujui</option>
                  </select>
                  <Link
                    href={`/leads/${leadId}/rab/${rab.id}`}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Buka
                  </Link>

                  {/* Desktop: Duplikasi & Hapus sebagai tombol terpisah */}
                  <button
                    onClick={() => handleDuplicateRab(rab.id)}
                    disabled={duplicatingId === rab.id}
                    title="Duplikasi RAB (untuk membuat penawaran harga alternatif dengan komponen yang sama)"
                    className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition disabled:opacity-50"
                  >
                    {duplicatingId === rab.id ? "..." : "Duplikasi"}
                  </button>
                  <button
                    onClick={() => handleDeleteRab(rab.id)}
                    disabled={deletingId === rab.id || lunas}
                    title={lunas ? "RAB sudah lunas dan tidak dapat dihapus" : undefined}
                    className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    {deletingId === rab.id ? "..." : "Hapus"}
                  </button>

                  {/* Mobile: Duplikasi & Hapus digabung jadi satu dropdown biar tidak sesak */}
                  <div className="sm:hidden">
                    <ActionDropdown
                      align="right"
                      label="⋯"
                      buttonClassName="px-2.5 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition"
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

      <ActivityTimeline entityType="lead" entityId={leadId} />
    </div>
  );
}
