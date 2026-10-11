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
import { MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardIconButton, EyeIcon, PencilIcon, TrashIcon } from "@/components/MobileCard";
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
        <td key={i} className="px-3 py-2">
          <div className="h-3 bg-hover rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
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
      <div className="bg-white rounded-md border border-line overflow-hidden">
        <table className="w-full text-[13px]">
          <tbody className="divide-y divide-line">
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={13} />)}
          </tbody>
        </table>
      </div>
    );

  if (error)
    return <div className="bg-danger-soft border border-danger-line rounded-md p-4 text-danger text-sm">Error: {error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted">{filteredLeads.length} lead</p>
        <div className="flex gap-2">
          <button
            className="px-2.5 py-1.5 border border-line bg-white text-ink text-[13px] rounded-md hover:bg-hover transition-colors font-medium"
            onClick={handleExport}
          >
            ↓ Export CSV
          </button>
          <button
            className="px-2.5 py-1.5 bg-accent text-white text-[13px] rounded-md hover:bg-accent-hover transition font-medium"
            onClick={() => { setEditingLead(null); setShowModal(true); }}
          >
            + Tambah Lead
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-md border border-line p-4 mb-6 flex flex-col gap-4">
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
              className="w-full px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink placeholder:text-faint focus:ring-2 focus:ring-accent/25"
              autoComplete="off"
            />
            {clientQuery && (
              <div className="absolute z-10 left-0 right-0 bg-white border border-line rounded-b-lg shadow max-h-48 overflow-y-auto">
                {filteredClients.length === 0 && (
                  <div className="px-3 py-2 text-faint text-sm">Tidak ditemukan</div>
                )}
                {filteredClients.map((c: typeof clients[0]) => (
                  <div
                    key={c.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-accent-soft text-sm text-ink ${selectedClient === c.id ? "bg-accent-soft" : ""}`}
                    onClick={() => {
                      setSelectedClient(c.id);
                      setClientQuery(c.name + (c.phone ? ` (${c.phone})` : ""));
                    }}
                  >
                    {c.name} {c.phone && <span className="text-xs text-faint">({c.phone})</span>}
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
            <label className="block text-xs font-medium text-muted mb-1">Follow Up Date</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={followUpStart}
                onChange={e => setFollowUpStart(e.target.value)}
                className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 flex-1 min-w-0"
              />
              <span className="text-faint shrink-0">—</span>
              <input
                type="date"
                value={followUpEnd}
                onChange={e => setFollowUpEnd(e.target.value)}
                className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 flex-1 min-w-0"
              />
            </div>
          </div>
          {/* Updated At Date Range */}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Updated At</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={updatedStart}
                onChange={e => setUpdatedStart(e.target.value)}
                className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 flex-1 min-w-0"
              />
              <span className="text-faint shrink-0">—</span>
              <input
                type="date"
                value={updatedEnd}
                onChange={e => setUpdatedEnd(e.target.value)}
                className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 flex-1 min-w-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white rounded-md border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-[13px]">
            <thead className="bg-surface border-b border-line">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap w-10"><span className="sr-only">Aksi</span></th>
                <SortableHeader label="Client" col="client_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Nama Project" col="project_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Priority" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-right text-xs font-medium text-muted whitespace-nowrap">Nilai</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-muted whitespace-nowrap">No Response</th>
                <SortableHeader label="Source" col="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Follow Up" col="follow_up_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Last Contact" col="last_contacted_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Closed At" col="closed_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Updated At" col="updated_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pagedLeads.map((lead) => {
                const client = clients.find((c) => c.id === lead.client_id);
                return (
                  <tr key={lead.id} className="hover:bg-hover transition-colors cursor-pointer" onDoubleClick={() => router.push(`/leads/${lead.id}`)}>
                    <td className="px-3 py-2 whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
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
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">
                      <div>{client?.name || "-"}</div>
                      {client?.phone && <div className="text-xs text-faint">{client.phone}</div>}
                    </td>
                    <td className="px-3 py-2 text-ink whitespace-nowrap">{lead.project_name || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || "tone-neutral"}`}>
                        {lead.status}
                      </span>
                      {lead.is_stale && (
                        <span title="Contacted > 7 hari tanpa kontak terbaru" className="ml-1.5 px-1.5 py-px rounded text-[11px] font-medium border border-line text-warning">
                          Stale
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {lead.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[lead.priority] || "tone-neutral"}`}>
                          {lead.priority}
                        </span>
                      ) : <span className="text-faint">-</span>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {lead.nominal_deal != null ? (
                        <span className="text-ink font-medium">{formatRupiah(lead.nominal_deal)}</span>
                      ) : lead.budget != null ? (
                        <span className="text-faint italic" title="Estimasi budget, belum final">{formatRupiah(lead.budget)}</span>
                      ) : (
                        <span className="text-faint">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {lead.no_response_count ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.no_response_count >= 2 ? "tone-danger" : "tone-neutral"}`}>
                          {lead.no_response_count}
                        </span>
                      ) : <span className="text-faint">-</span>}
                    </td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{lead.source || client?.source || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {(() => {
                        const overdue = !!lead.follow_up_date
                          && lead.follow_up_date < new Date().toISOString().slice(0, 10)
                          && lead.status !== "Deal Won" && lead.status !== "Deal Lost";
                        return (
                          <span className={overdue ? "text-danger font-medium" : "text-muted"}>
                            {formatDate(lead.follow_up_date)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(lead.last_contacted_at)}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(lead.closed_at)}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(lead.updated_at)}</td>
                    <td className="px-3 py-2 text-muted max-w-[160px] truncate">{lead.notes || "-"}</td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-faint text-sm">
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

      {/* Cards (mobile) */}
      <div className="sm:hidden">
        <MobileCardList>
          {pagedLeads.map((lead) => {
            const client = clients.find((c) => c.id === lead.client_id);
            const overdue = !!lead.follow_up_date
              && lead.follow_up_date < new Date().toISOString().slice(0, 10)
              && lead.status !== "Deal Won" && lead.status !== "Deal Lost";
            return (
              <MobileCard key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)}>
                <MobileCardHeader
                  title={client?.name || "-"}
                  subtitle={client?.phone ? <span className="text-xs text-faint">{client.phone}</span> : undefined}
                  actions={
                    <>
                      <MobileCardIconButton title="Lihat" onClick={() => setViewingLead(lead)}><EyeIcon /></MobileCardIconButton>
                      <MobileCardIconButton title="Edit" onClick={() => handleEdit(lead)}><PencilIcon /></MobileCardIconButton>
                      <MobileCardIconButton title="Hapus" danger onClick={() => confirmDelete(lead.id)}><TrashIcon /></MobileCardIconButton>
                    </>
                  }
                />
                <MobileCardRow label="Nama Project">{lead.project_name || "-"}</MobileCardRow>
                <MobileCardRow label="Status">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || "tone-neutral"}`}>
                      {lead.status}
                    </span>
                    {lead.is_stale && (
                      <span className="px-1.5 py-px rounded text-[11px] font-medium border border-line text-warning">Stale</span>
                    )}
                  </span>
                </MobileCardRow>
                <MobileCardRow label="Priority">
                  {lead.priority ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[lead.priority] || "tone-neutral"}`}>
                      {lead.priority}
                    </span>
                  ) : "-"}
                </MobileCardRow>
                <MobileCardRow label="Nilai">
                  {lead.nominal_deal != null
                    ? formatRupiah(lead.nominal_deal)
                    : lead.budget != null ? formatRupiah(lead.budget) : "-"}
                </MobileCardRow>
                <MobileCardRow label="No Response">
                  {lead.no_response_count ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${lead.no_response_count >= 2 ? "tone-danger" : "tone-neutral"}`}>
                      {lead.no_response_count}
                    </span>
                  ) : "-"}
                </MobileCardRow>
                <MobileCardRow label="Source">{lead.source || client?.source || "-"}</MobileCardRow>
                <MobileCardRow label="Follow Up">
                  <span className={overdue ? "text-danger font-medium" : ""}>{formatDate(lead.follow_up_date)}</span>
                </MobileCardRow>
                <MobileCardRow label="Last Contact">{formatDate(lead.last_contacted_at)}</MobileCardRow>
                <MobileCardRow label="Updated At">{formatDate(lead.updated_at)}</MobileCardRow>
                {lead.notes && <MobileCardRow label="Catatan">{lead.notes}</MobileCardRow>}
              </MobileCard>
            );
          })}
          {filteredLeads.length === 0 && (
            <div className="py-12 text-center text-faint text-sm bg-white rounded-lg border border-line">
              Belum ada lead. Klik &quot;Tambah Lead&quot; untuk memulai.
            </div>
          )}
        </MobileCardList>
        <div className="mt-3 bg-white rounded-lg border border-line overflow-hidden">
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
