"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { deleteLead } from "@/services/leads";
import { Lead } from "@/types/db";
import { useToast } from "@/components/Toast";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { exportCSV } from "@/utils/csv";
import { MultiSelect } from "@/components/MultiSelect";
import { ActionDropdown } from "@/components/ActionDropdown";
import {
  LEAD_STATUSES,
  LEAD_STATUS_COLORS,
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  SOURCES,
  toOptions,
} from "@/constants/options";
import { formatDate, formatRupiah } from "@/utils/format";
import { LeadFormModal } from "./LeadFormModal";
import { LeadViewModal } from "./LeadViewModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function LeadsTable() {
  const toast = useToast();
  const router = useRouter();

  const { leads, loading, error, refetch } = useLeads();
  const { clients } = useClients();
  const [editingLead, setEditingLead] = useState<Lead | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  // flow: lead → project
  const [projectFlowClientId, setProjectFlowClientId] = useState<string | null>(null);
  const [projectFlowLeadId, setProjectFlowLeadId] = useState<string | null>(null);
  const [showProjectFlow, setShowProjectFlow] = useState(false);

  const wonClientIds = new Set((leads ?? []).filter((l) => l.status === "Deal Won").map((l) => l.client_id));
  const wonClients = (clients ?? []).filter((c) => wonClientIds.has(c.id));

  // --- FILTER STATE ---
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [status, setStatus] = useState<string[]>([]);
  const [source, setSource] = useState<string[]>([]);
  const [priority, setPriority] = useState<string[]>([]);
  const [followUpStart, setFollowUpStart] = useState("");
  const [followUpEnd, setFollowUpEnd] = useState("");
  const [updatedStart, setUpdatedStart] = useState("");
  const [updatedEnd, setUpdatedEnd] = useState("");


  // --- AUTOCOMPLETE CLIENT LIST (only clients present in leads) ---
  const clientIdsInLeads = new Set((leads || []).map(l => l.client_id));
  const clientsInLeads = (clients || []).filter(c => clientIdsInLeads.has(c.id));
  const filteredClients = clientQuery
    ? clientsInLeads.filter(c => {
        const digits = clientQuery.replace(/\D/g, "");
        return c.name?.toLowerCase().includes(clientQuery.toLowerCase()) ||
          (digits.length > 0 && c.phone?.replace(/\D/g, "").includes(digits));
      })
    : clientsInLeads;

  // --- FILTERED LEADS ---
  const filteredLeads = (leads || []).filter(lead => {
    const client = (clients || []).find(c => c.id === lead.client_id);
    if (selectedClient) {
      if (lead.client_id !== selectedClient) return false;
    } else if (clientQuery) {
      const q = clientQuery.toLowerCase();
      const digits = clientQuery.replace(/\D/g, "");
      const match = client?.name?.toLowerCase().includes(q) ||
        (digits.length > 0 && client?.phone?.replace(/\D/g, "").includes(digits));
      if (!match) return false;
    }
    if (status.length > 0 && !status.includes(lead.status)) return false;
    if (source.length > 0 && !source.includes(client?.source ?? lead.source ?? "")) return false;
    if (priority.length > 0 && !priority.includes(lead.priority ?? "")) return false;
    if (followUpStart && lead.follow_up_date && lead.follow_up_date < followUpStart) return false;
    if (followUpEnd && lead.follow_up_date && lead.follow_up_date > followUpEnd) return false;
    if (updatedStart && lead.updated_at && lead.updated_at < updatedStart) return false;
    if (updatedEnd && lead.updated_at && lead.updated_at > updatedEnd) return false;
    return true;
  });

  const enrichedLeads = filteredLeads.map((l) => {
    const c = (clients || []).find((cl) => cl.id === l.client_id);
    return { ...l, client_name: c?.name ?? "", client_phone: c?.phone ?? "" };
  });

  const { sorted: sortedLeads, sortKey, sortDir, toggleSort } = useSortable(enrichedLeads);
  const { paged: pagedLeads, page, goTo, pageSize, changePageSize, totalPages, from, to, total } = usePagination(sortedLeads);

  const handleExport = () => {
    exportCSV(
      sortedLeads.map((l) => ({
        Klien: l.client_name,
        Telepon: l.client_phone,
        Status: l.status,
        Stale: l.is_stale ? "Ya" : "",
        Prioritas: l.priority ?? "",
        "No Response Count": l.no_response_count ?? 0,
        Sumber: l.source ?? "",
        Budget: l.budget ?? "",
        "Nominal Deal": l.nominal_deal ?? "",
        "Follow Up": formatDate(l.follow_up_date),
        "Last Contact": formatDate(l.last_contacted_at),
        "Ditutup": formatDate(l.closed_at),
        "Updated": formatDate(l.updated_at),
        Catatan: l.notes ?? "",
      })),
      "leads"
    );
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setShowModal(true);
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await deleteLead(deletingId);
      refetch();
      toast("Lead berhasil dihapus", "success");
    } catch {
      toast("Gagal hapus lead", "error");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  if (loading)
    return (
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={13} />)}
          </tbody>
        </table>
      </div>
    );

  if (error)
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">Error: {error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-gray-50/95 backdrop-blur-sm py-3 mb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">{filteredLeads.length} lead</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition font-medium"
            onClick={handleExport}
          >
            ↓ Export CSV
          </button>
          <button
            className="px-5 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition font-medium"
            onClick={() => { setEditingLead(null); setShowModal(true); }}
          >
            + Tambah Lead
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mb-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Client autocomplete */}
          <div className="relative">
            <input
              type="text"
              value={clientQuery}
              onChange={e => {
                setClientQuery(e.target.value);
                setSelectedClient("");
              }}
              placeholder="Cari Client (nama/telepon)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900"
              autoComplete="off"
            />
            {clientQuery && (
              <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow max-h-48 overflow-y-auto">
                {filteredClients.length === 0 && (
                  <div className="px-3 py-2 text-gray-400 text-sm">Tidak ditemukan</div>
                )}
                {filteredClients.map((c: typeof clients[0]) => (
                  <div
                    key={c.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm text-gray-900 ${selectedClient === c.id ? "bg-purple-100" : ""}`}
                    onClick={() => {
                      setSelectedClient(c.id);
                      setClientQuery(c.name + (c.phone ? ` (${c.phone})` : ""));
                    }}
                  >
                    {c.name} {c.phone && <span className="text-xs text-gray-400">({c.phone})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Status dropdown */}
          <MultiSelect
            placeholder="Status"
            options={LEAD_STATUSES.map(s => ({ value: s, label: s }))}
            value={status}
            onChange={setStatus}
          />
          {/* Source dropdown */}
          <MultiSelect
            placeholder="Sumber"
            options={toOptions(SOURCES)}
            value={source}
            onChange={setSource}
          />
          {/* Priority dropdown */}
          <MultiSelect
            placeholder="Prioritas"
            options={toOptions(PRIORITIES, PRIORITY_LABELS)}
            value={priority}
            onChange={setPriority}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Follow Up Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Follow Up Date</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={followUpStart}
                onChange={e => setFollowUpStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-gray-900 flex-1 min-w-0"
              />
              <span className="text-gray-400 shrink-0">—</span>
              <input
                type="date"
                value={followUpEnd}
                onChange={e => setFollowUpEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-gray-900 flex-1 min-w-0"
              />
            </div>
          </div>
          {/* Updated At Date Range */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Updated At</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={updatedStart}
                onChange={e => setUpdatedStart(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-gray-900 flex-1 min-w-0"
              />
              <span className="text-gray-400 shrink-0">—</span>
              <input
                type="date"
                value={updatedEnd}
                onChange={e => setUpdatedEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-gray-900 flex-1 min-w-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800">Pipeline Lead</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                <SortableHeader label="Client" col="client_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Nama Project" col="project_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Priority" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nilai</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No Response</th>
                <SortableHeader label="Source" col="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Follow Up" col="follow_up_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Last Contact" col="last_contacted_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Closed At" col="closed_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Updated At" col="updated_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedLeads.map((lead) => {
                const client = clients.find((c) => c.id === lead.client_id);
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => router.push(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3 whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
                      <ActionDropdown
                        align="left"
                        items={[
                          {
                            key: "detail",
                            label: "Detail",
                            href: `/leads/${lead.id}`,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            ),
                          },
                          {
                            key: "view",
                            label: "Lihat",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ),
                            onClick: () => setViewingLead(lead),
                          },
                          {
                            key: "edit",
                            label: "Edit",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            ),
                            onClick: () => handleEdit(lead),
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            danger: true,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ),
                            onClick: () => confirmDelete(lead.id),
                          },
                        ]}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <div>{client?.name || "-"}</div>
                      {client?.phone && <div className="text-xs text-gray-400">{client.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-sm">{lead.project_name || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-700"}`}>
                        {lead.status}
                      </span>
                      {lead.is_stale && (
                        <span title="Contacted > 7 hari tanpa kontak terbaru" className="ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                          Stale
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[lead.priority] || "bg-gray-100 text-gray-600"}`}>
                          {lead.priority}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-sm">
                      {lead.nominal_deal != null ? (
                        <span className="text-gray-900 font-medium">{formatRupiah(lead.nominal_deal)}</span>
                      ) : lead.budget != null ? (
                        <span className="text-gray-400 italic" title="Estimasi budget, belum final">{formatRupiah(lead.budget)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap text-sm">
                      {lead.no_response_count ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.no_response_count >= 2 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {lead.no_response_count}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{lead.source || client?.source || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {(() => {
                        const overdue = !!lead.follow_up_date
                          && lead.follow_up_date < new Date().toISOString().slice(0, 10)
                          && lead.status !== "Deal Won" && lead.status !== "Deal Lost";
                        return (
                          <span className={overdue ? "text-red-600 font-medium" : "text-gray-600"}>
                            {formatDate(lead.follow_up_date)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{formatDate(lead.last_contacted_at)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{formatDate(lead.closed_at)}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{formatDate(lead.updated_at)}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate text-sm">{lead.notes || "-"}</td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Belum ada lead. Klik "Tambah Lead" untuk memulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            from={from}
            to={to}
            total={total}
            pageSize={pageSize}
            onPageChange={goTo}
            onPageSizeChange={changePageSize}
          />
        </div>
      </div>

      {showModal && (
        <LeadFormModal
          lead={editingLead}
          clients={clients || []}
          onSaved={() => { setShowModal(false); setEditingLead(undefined); refetch(); }}
          onClose={() => { setShowModal(false); setEditingLead(undefined); }}
          onSavedAndAddProject={(lead) => {
            setShowModal(false);
            setEditingLead(undefined);
            refetch();
            setProjectFlowClientId(lead.client_id ?? null);
            setProjectFlowLeadId(lead.id);
            setShowProjectFlow(true);
          }}
        />
      )}

      {showProjectFlow && (
        <ProjectFormModal
          wonClients={wonClients}
          allClients={clients ?? []}
          autoClientId={projectFlowClientId}
          autoLeadId={projectFlowLeadId}
          onSaved={() => { setShowProjectFlow(false); setProjectFlowClientId(null); setProjectFlowLeadId(null); }}
          onClose={() => { setShowProjectFlow(false); setProjectFlowClientId(null); setProjectFlowLeadId(null); }}
        />
      )}

      {viewingLead && (
        <LeadViewModal
          lead={viewingLead}
          client={clients.find((c) => c.id === viewingLead.client_id)}
          onClose={() => setViewingLead(null)}
          onEdit={(l) => { setViewingLead(null); handleEdit(l); }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Hapus Lead?"
          description="Data lead ini akan dihapus permanen."
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => { setShowDeleteModal(false); setDeletingId(null); }}
        />
      )}
    </div>
  );
}
