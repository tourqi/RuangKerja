"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { useRabList } from "@/hooks/useRab";
import { addRab, deleteRab, updateRab } from "@/services/rab";
import { useToast } from "@/components/Toast";
import { useState } from "react";
import { Rab } from "@/types/db";

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const statusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Survey: "bg-purple-100 text-purple-800",
  Deal: "bg-green-100 text-green-800",
  Lost: "bg-red-100 text-red-800",
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

const rabStatusLabel: Record<string, string> = {
  draft: "Draft",
  sent: "Terkirim",
  approved: "Disetujui",
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
  const { leads, loading: ll } = useLeads();
  const { clients, loading: lc } = useClients();
  const { rabList, loading: lr, refetch: refetchRab } = useRabList(leadId);

  const [tab, setTab] = useState<"info" | "rab">("info");
  const [showAddRab, setShowAddRab] = useState(false);
  const [newRabNama, setNewRabNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      <div className="p-6 max-w-4xl mx-auto">
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
      console.error("addRab error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRab(id: string) {
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

  async function handleStatusChange(rab: Rab, status: Rab["status"]) {
    try {
      await updateRab(rab.id, { status });
      await refetchRab();
      toast("Status RAB diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <span>←</span> Kembali ke Leads
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client?.name ?? "Unknown Client"}</h1>
            {client?.project_name && (
              <p className="text-sm text-gray-500 mt-0.5">{client.project_name}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[lead.status] ?? "bg-gray-100 text-gray-700"}`}>
                {lead.status}
              </span>
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
          <div className="flex gap-6 flex-shrink-0 text-center">
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["info", "rab"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {t === "info" ? "Informasi Lead" : `RAB (${rabList.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === "info" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <InfoRow label="Client" value={client?.name} />
            <InfoRow label="No. HP" value={client?.phone} />
            <InfoRow label="Sumber" value={lead.source} />
            <InfoRow label="Status" value={lead.status} />
            <InfoRow label="Prioritas" value={lead.priority} />
            <InfoRow label="Ditugaskan ke" value={lead.assigned_to} />
            <InfoRow label="Follow-up" value={formatDate(lead.follow_up_date)} />
            <InfoRow label="Last Contact" value={formatDate(lead.last_contacted_at)} />
            <InfoRow label="Ditutup" value={formatDate(lead.closed_at)} />
          </div>
          {lead.notes && (
            <div className="pt-5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Catatan</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: RAB */}
      {tab === "rab" && (
        <div className="space-y-4">
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
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
              {rabList.map((rab) => (
                <div key={rab.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{rab.nama}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Dibuat {formatDate(rab.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <select
                      value={rab.status}
                      onChange={(e) => handleStatusChange(rab, e.target.value as Rab["status"])}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 ${rabStatusColors[rab.status]}`}
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
                    <button
                      onClick={() => handleDeleteRab(rab.id)}
                      disabled={deletingId === rab.id}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      {deletingId === rab.id ? "..." : "Hapus"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ActivityTimeline entityType="lead" entityId={leadId} />
    </div>
  );
}
