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
import {
  CLIENT_LEAD_STATUSES,
  CLIENT_LEAD_STATUS_COLORS,
  PRIORITY_COLORS,
  PROPERTY_TYPES,
  BUDGET_RANGES,
  SOURCES,
  toOptions,
} from "@/constants/options";

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

  const wonClientIds = new Set((leads ?? []).filter((l) => l.status === "Deal").map((l) => l.client_id));
  const wonClients = (clients ?? []).filter((c) => wonClientIds.has(c.id));

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
            options={[
              { value: "Low", label: "Low" },
              { value: "Medium", label: "Medium" },
              { value: "High", label: "High" },
              { value: "Urgent", label: "Urgent" },
            ]}
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
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={11} />)}
              </tbody>
            </table>
          ) : error ? (
            <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <SortableHeader label="Nama" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="No. HP" col="phone" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Alamat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama Project</th>
                  <SortableHeader label="Tipe" col="property_type" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Budget" col="budget_range" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Status" col="lead_status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Sumber" col="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableHeader label="Prioritas" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Catatan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => router.push(`/clients/${client.id}`)}>
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
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.source || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[client.priority] || "bg-gray-100 text-gray-700"}`}>
                          {client.priority}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{client.notes || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition"
                          onClick={() => setViewingClient(client)}
                        >
                          Lihat
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                          onClick={() => handleEdit(client)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                          onClick={() => confirmDelete(client.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-gray-400 text-sm">
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
