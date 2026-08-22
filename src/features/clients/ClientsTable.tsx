"use client";
import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { deleteClient } from "@/services/clients";
import { Client } from "@/types/db";
import { useToast } from "@/components/Toast";
import { ClientFormModal } from "./ClientFormModal";
import { ClientViewModal } from "./ClientViewModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { LeadFormModal } from "@/features/leads/LeadFormModal";
import { ProjectFormModal } from "@/features/projects/ProjectFormModal";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { exportCSV } from "@/utils/csv";
import { MultiSelect } from "@/components/MultiSelect";
import { ActionDropdown } from "@/components/ActionDropdown";
import {
  CLIENT_LEAD_STATUSES,
  CLIENT_LEAD_STATUS_COLORS,
  PRIORITIES,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  PROPERTY_TYPES,
  BUDGET_RANGES,
  SOURCES,
  toOptions,
} from "@/constants/options";
import { formatDate } from "@/utils/format";

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

export default function ClientsTable() {
  const toast = useToast();
  const router = useRouter();
  const { clients, loading, error, refetch } = useClients();
  const { leads } = useLeads();
  const [editingClient, setEditingClient] = useState<Client | null | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  // cross-modal flow: client → lead → project
  const [leadFlowClientId, setLeadFlowClientId] = useState<string | null>(null);
  const [showLeadFlow, setShowLeadFlow] = useState(false);
  const [projectFlowClientId, setProjectFlowClientId] = useState<string | null>(null);
  const [projectFlowLeadId, setProjectFlowLeadId] = useState<string | null>(null);
  const [showProjectFlow, setShowProjectFlow] = useState(false);

  const wonClientIds = new Set((leads ?? []).filter((l) => l.status === "Deal Won").map((l) => l.client_id));
  const wonClients = (clients ?? []).filter((c) => wonClientIds.has(c.id));

  // Lead paling aktif per client — sama pola "latest lead" yang dipakai
  // sync_client_lead_status() di DB buat nurunin lead_status/priority, dipakai
  // di sini buat nampilin next-action (follow-up date) & Stale tanpa perlu
  // klik ke detail client.
  const getLatestLead = (clientId: string) => {
    const clientLeads = (leads ?? []).filter((l) => l.client_id === clientId);
    if (clientLeads.length === 0) return undefined;
    return [...clientLeads].sort((a, b) => {
      const at = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
      const bt = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
      return bt - at;
    })[0];
  };

  const [filter, setFilter] = useState({
    name: "",
    project_name: "",
    property_type: [] as string[],
    budget_range: [] as string[],
    lead_status: [] as string[],
    source: [] as string[],
    priority: [] as string[],
  });

  const handleEdit = (client: Client) => {
    setEditingClient(client);
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
      await deleteClient(deletingId);
      refetch();
      toast("Client berhasil dihapus", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast("Gagal hapus client: " + msg, "error");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const filteredClients = clients.filter((c) =>
    (!filter.name || c.name?.toLowerCase().includes(filter.name.toLowerCase())) &&
    (!filter.project_name || c.project_name?.toLowerCase().includes(filter.project_name.toLowerCase())) &&
    (filter.property_type.length === 0 || filter.property_type.includes(c.property_type ?? "")) &&
    (filter.budget_range.length === 0 || filter.budget_range.includes(c.budget_range ?? "")) &&
    (filter.lead_status.length === 0 || filter.lead_status.includes(c.lead_status ?? "")) &&
    (filter.source.length === 0 || filter.source.includes(c.source ?? "")) &&
    (filter.priority.length === 0 || filter.priority.includes(c.priority ?? ""))
  );

  const { sorted: sortedClients, sortKey, sortDir, toggleSort } = useSortable(filteredClients);
  const { paged: pagedClients, page, goTo, pageSize, changePageSize, totalPages, from, to, total } = usePagination(sortedClients);

  const handleExport = () => {
    exportCSV(
      sortedClients.map((c) => ({
        Nama: c.name as string,
        Telepon: (c.phone as string) ?? "",
        Alamat: (c.address as string) ?? "",
        "Nama Project": (c.project_name as string) ?? "",
        "Tipe Properti": (c.property_type as string) ?? "",
        Budget: (c.budget_range as string) ?? "",
        "Status Lead": (c.lead_status as string) ?? "",
        Sumber: (c.source as string) ?? "",
        Prioritas: (c.priority as string) ?? "",
        Catatan: (c.notes as string) ?? "",
        Dibuat: (c.created_at as string)?.slice(0, 10) ?? "",
      })),
      "clients"
    );
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-gray-50/95 backdrop-blur-sm py-3 mb-3 flex items-center justify-between">
        <div className="flex items-center justify-between w-full">
          <p className="text-sm text-gray-500">{filteredClients.length} client ditemukan</p>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition font-medium"
              onClick={handleExport}
            >
              ↓ Export CSV
            </button>
            <button
              className="px-5 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition font-medium"
              onClick={() => { setEditingClient(null); setShowModal(true); }}
            >
              + Tambah Client
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            name="name"
            value={filter.name}
            onChange={handleFilterChange}
            placeholder="Cari Nama..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none"
          />
          <input
            name="project_name"
            value={filter.project_name}
            onChange={handleFilterChange}
            placeholder="Cari Project..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-black focus:border-black outline-none"
          />
          <MultiSelect
            placeholder="Semua Tipe"
            options={toOptions(PROPERTY_TYPES)}
            value={filter.property_type}
            onChange={(v) => setFilter((prev) => ({ ...prev, property_type: v }))}
          />
          <MultiSelect
            placeholder="Semua Budget"
            options={toOptions(BUDGET_RANGES)}
            value={filter.budget_range}
            onChange={(v) => setFilter((prev) => ({ ...prev, budget_range: v }))}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MultiSelect
            placeholder="Semua Status"
            options={toOptions(CLIENT_LEAD_STATUSES)}
            value={filter.lead_status}
            onChange={(v) => setFilter((prev) => ({ ...prev, lead_status: v }))}
          />
          <MultiSelect
            placeholder="Semua Sumber"
            options={toOptions(SOURCES)}
            value={filter.source}
            onChange={(v) => setFilter((prev) => ({ ...prev, source: v }))}
          />
          <MultiSelect
            placeholder="Semua Prioritas"
            options={toOptions(PRIORITIES, PRIORITY_LABELS)}
            value={filter.priority}
            onChange={(v) => setFilter((prev) => ({ ...prev, priority: v }))}
          />
          <button
            onClick={() => setFilter({ name: "", project_name: "", property_type: [], budget_range: [], lead_status: [], source: [], priority: [] })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 hover:bg-gray-50 transition outline-none"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800">Daftar Client</h3>
        </div>
        <div className="w-full overflow-x-auto">
          {loading ? (
            <table className="w-full min-w-[960px] text-sm">
              <tbody className="divide-y divide-gray-100">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={12} />)}
              </tbody>
            </table>
          ) : error ? (
            <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                  <SortableHeader label="Nama" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="No. HP" col="phone" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Alamat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama Project</th>
                  <SortableHeader label="Tipe" col="property_type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Budget" col="budget_range" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Status" col="lead_status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Follow-up</th>
                  <SortableHeader label="Sumber" col="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Prioritas" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => router.push(`/clients/${client.id}`)}>
                    <td className="px-4 py-3 whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
                      <ActionDropdown
                        align="left"
                        items={[
                          {
                            key: "detail",
                            label: "Lihat Detail",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ),
                            onClick: () => setViewingClient(client),
                          },
                          {
                            key: "edit",
                            label: "Edit",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            ),
                            onClick: () => handleEdit(client),
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            danger: true,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ),
                            onClick: () => confirmDelete(client.id),
                          },
                        ]}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap max-w-[150px] truncate">
                      <Link href={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.phone || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{client.address || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{client.project_name || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.property_type || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.budget_range || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.lead_status ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_LEAD_STATUS_COLORS[client.lead_status] || "bg-gray-100 text-gray-700"}`}>
                          {client.lead_status}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => {
                        const latestLead = getLatestLead(client.id);
                        if (!latestLead) return <span className="text-gray-400 text-sm">-</span>;
                        const overdue = !!latestLead.follow_up_date
                          && latestLead.follow_up_date < new Date().toISOString().slice(0, 10)
                          && latestLead.status !== "Deal Won" && latestLead.status !== "Deal Lost";
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm ${overdue ? "text-red-600 font-medium" : "text-gray-600"}`}>
                              {formatDate(latestLead.follow_up_date)}
                            </span>
                            {latestLead.is_stale && (
                              <span title="Contacted > 7 hari tanpa kontak terbaru" className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                                Stale
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.source || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[client.priority] || "bg-gray-100 text-gray-700"}`}>
                          {client.priority}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{client.notes || "-"}</td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-gray-400 text-sm">
                      Tidak ada client yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
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
        <ClientFormModal
          client={editingClient}
          onSaved={() => { setShowModal(false); setEditingClient(undefined); refetch(); }}
          onClose={() => { setShowModal(false); setEditingClient(undefined); }}
          onSavedAndAddLead={(client) => {
            setShowModal(false);
            setEditingClient(undefined);
            refetch();
            setLeadFlowClientId(client.id);
            setShowLeadFlow(true);
          }}
        />
      )}

      {showLeadFlow && (
        <LeadFormModal
          clients={clients ?? []}
          preselectedClientId={leadFlowClientId}
          onSaved={() => { setShowLeadFlow(false); setLeadFlowClientId(null); }}
          onClose={() => { setShowLeadFlow(false); setLeadFlowClientId(null); }}
          onSavedAndAddProject={(lead) => {
            setShowLeadFlow(false);
            setLeadFlowClientId(null);
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

      {viewingClient && (
        <ClientViewModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={(c) => { setViewingClient(null); handleEdit(c); }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Hapus Client?"
          description="Data client akan dihapus permanen dan tidak dapat dikembalikan."
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => { setShowDeleteModal(false); setDeletingId(null); }}
        />
      )}
    </div>
  );
}
