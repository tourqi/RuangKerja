"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { addLead, updateLead, deleteLead } from "@/services/leads";
import { Lead, LeadStatus } from "@/types/db";
import { useToast } from "@/components/Toast";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { exportCSV } from "@/utils/csv";

const statusOptions: LeadStatus[] = ["New Lead", "Contacted", "Survey", "Deal", "Lost"];

const statusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Survey: "bg-purple-100 text-purple-800",
  Deal: "bg-green-100 text-green-800",
  Lost: "bg-red-100 text-red-800",
};

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

  // --- MODAL AUTOCOMPLETE CLIENTS ---
  const [modalClientQuery, setModalClientQuery] = useState("");
  const [modalShowClientDropdown, setModalShowClientDropdown] = useState(false);

  const priorityOptionsModal = ["low", "medium", "high", "urgent"];

  // --- HOOKS ---
  const { leads, loading, error, refetch } = useLeads();
  const { clients } = useClients();
  const [form, setForm] = useState<Partial<Lead>>({ status: "New Lead" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);

  // --- FILTER STATE ---
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [followUpStart, setFollowUpStart] = useState("");
  const [followUpEnd, setFollowUpEnd] = useState("");
  const [updatedStart, setUpdatedStart] = useState("");
  const [updatedEnd, setUpdatedEnd] = useState("");

  // --- DERIVED FILTER OPTIONS ---
  const sourceOptions = Array.from(new Set((clients || []).map(c => c.source).filter(Boolean)));
  const priorityOptions = Array.from(new Set((clients || []).map(c => c.priority).filter(Boolean)));

  // --- MODAL AUTOCOMPLETE ---
  const modalFilteredClients = modalClientQuery
    ? (clients || []).filter(c => {
        const digits = modalClientQuery.replace(/\D/g, "");
        return c.name?.toLowerCase().includes(modalClientQuery.toLowerCase()) ||
          (digits.length > 0 && c.phone?.replace(/\D/g, "").includes(digits));
      })
    : (clients || []);

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
    if (status && lead.status !== status) return false;
    if (source && (client?.source || lead.source) !== source) return false;
    if (priority && lead.priority !== priority) return false;
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
        Prioritas: l.priority ?? "",
        Sumber: l.source ?? "",
        "Follow Up": l.follow_up_date?.slice(0, 10) ?? "",
        "Last Contact": l.last_contacted_at?.slice(0, 10) ?? "",
        "Ditutup": l.closed_at?.slice(0, 10) ?? "",
        "Updated": l.updated_at?.slice(0, 10) ?? "",
        Catatan: l.notes ?? "",
      })),
      "leads"
    );
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.client_id) { toast("Pilih client terlebih dahulu", "warning"); return; }
    setSaving(true);
    try {
      const LEAD_COLUMNS: (keyof Lead)[] = [
        "client_id", "status", "priority", "source",
        "follow_up_date", "last_contacted_at", "closed_at", "notes",
      ];
      const payload = Object.fromEntries(
        LEAD_COLUMNS
          .filter(k => form[k] !== undefined && form[k] !== "")
          .map(k => [k, form[k]])
      ) as Omit<Lead, "id" | "created_at">;
      payload.status = (form.status || "New Lead") as LeadStatus;
      await addLead(payload);
      setForm({ status: "New Lead" });
      setModalClientQuery("");
      setShowModal(false);
      refetch();
      toast("Lead berhasil ditambahkan", "success");
    } catch (err: unknown) {
      const pg = err as { message?: string };
      toast(`Gagal menambah lead: ${pg?.message || "Terjadi kesalahan"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm(lead);
    setShowModal(true);
  };

  const handleUpdate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const LEAD_COLUMNS: (keyof Lead)[] = [
        "client_id", "status", "priority", "source",
        "follow_up_date", "last_contacted_at", "closed_at", "notes",
      ];
      const payload = Object.fromEntries(
        LEAD_COLUMNS
          .filter((k) => form[k] !== undefined)
          .map((k) => [k, form[k] === "" ? null : form[k]])
      ) as Partial<Lead>;
      payload.status = (form.status || "New Lead") as LeadStatus;
      await updateLead(editingId, payload);
      setEditingId(null);
      setForm({ status: "New Lead" });
      setShowModal(false);
      refetch();
      toast("Lead berhasil diperbarui", "success");
    } catch {
      toast("Gagal update lead", "error");
    } finally {
      setSaving(false);
    }
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
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={8} />)}
          </tbody>
        </table>
      </div>
    );

  if (error)
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">Error: {error}</div>;

  return (
    <div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500"
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
                    className={`px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm ${selectedClient === c.id ? "bg-purple-100" : ""}`}
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
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Status</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* Source dropdown */}
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Sumber</option>
            {sourceOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* Priority dropdown */}
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Prioritas</option>
            {priorityOptions.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500 flex-1 min-w-0"
              />
              <span className="text-gray-400 shrink-0">—</span>
              <input
                type="date"
                value={followUpEnd}
                onChange={e => setFollowUpEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500 flex-1 min-w-0"
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
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500 flex-1 min-w-0"
              />
              <span className="text-gray-400 shrink-0">—</span>
              <input
                type="date"
                value={updatedEnd}
                onChange={e => setUpdatedEnd(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-purple-500 flex-1 min-w-0"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{filteredLeads.length} lead</p>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition font-medium"
            onClick={handleExport}
          >
            ↓ Export CSV
          </button>
          <button
            className="px-5 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition font-medium"
            onClick={() => { setEditingId(null); setForm({ status: "New Lead" }); setShowModal(true); }}
          >
            + Tambah Lead
          </button>
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
                <SortableHeader label="Client" col="client_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Priority" col="priority" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Source" col="source" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Follow Up" col="follow_up_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Last Contact" col="last_contacted_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Closed At" col="closed_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Updated At" col="updated_at" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Catatan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedLeads.map((lead) => {
                const client = clients.find((c) => c.id === lead.client_id);
                const priorityColors: Record<string, string> = {
                  low: "bg-gray-100 text-gray-600",
                  medium: "bg-blue-100 text-blue-700",
                  high: "bg-orange-100 text-orange-700",
                  urgent: "bg-red-100 text-red-700",
                };
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      <div>{client?.name || "-"}</div>
                      {client?.phone && <div className="text-xs text-gray-400">{client.phone}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {lead.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[lead.priority] || "bg-gray-100 text-gray-600"}`}>
                          {lead.priority}
                        </span>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{lead.source || client?.source || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{lead.follow_up_date ? lead.follow_up_date.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{lead.last_contacted_at ? lead.last_contacted_at.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{lead.closed_at ? lead.closed_at.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{lead.updated_at ? lead.updated_at.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate text-sm">{lead.notes || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                        >
                          Detail
                        </Link>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition"
                          onClick={() => setViewingLead(lead)}
                        >
                          Lihat
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition"
                          onClick={() => handleEdit(lead)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                          onClick={() => confirmDelete(lead.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-400 text-sm">
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

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Lead" : "Tambah Lead Baru"}
              </h2>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                onClick={() => { setShowModal(false); setEditingId(null); setForm({ status: "New Lead" }); setModalClientQuery(""); setModalShowClientDropdown(false); }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="px-6 py-5 space-y-4">
              {/* Client Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={modalClientQuery}
                  onChange={e => {
                    setModalClientQuery(e.target.value);
                    setModalShowClientDropdown(true);
                  }}
                  onFocus={() => setModalShowClientDropdown(true)}
                  placeholder="Cari nama/telepon client"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="off"
                />
                {modalShowClientDropdown && modalClientQuery && (
                  <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow max-h-48 overflow-y-auto">
                    {modalFilteredClients.length === 0 && (
                      <div className="px-3 py-2 text-gray-400 text-sm">Tidak ditemukan</div>
                    )}
                    {modalFilteredClients.map(c => (
                      <div
                        key={c.id}
                        className={`px-3 py-2 cursor-pointer hover:bg-purple-50 text-sm ${form.client_id === c.id ? "bg-purple-100" : ""}`}
                        onClick={() => {
                          setForm({ ...form, client_id: c.id, source: c.source || form.source });
                          setModalClientQuery(c.name + (c.phone ? ` (${c.phone})` : ""));
                          setModalShowClientDropdown(false);
                        }}
                      >
                        {c.name} {c.phone && <span className="text-xs text-gray-400">({c.phone})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Status Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                <select
                  name="status"
                  value={form.status || "New Lead"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {/* Priority Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  name="priority"
                  value={form.priority || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Pilih Prioritas</option>
                  {priorityOptionsModal.map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              {/* Source Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  name="source"
                  value={form.source || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-500"
                >
                  <option value="">Pilih Source</option>
                  {sourceOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              {/* Date Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Follow Up Date</label>
                  <input
                    type="date"
                    name="follow_up_date"
                    value={form.follow_up_date || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Contacted At</label>
                  <input
                    type="date"
                    name="last_contacted_at"
                    value={form.last_contacted_at || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closed At</label>
                  <input
                    type="date"
                    name="closed_at"
                    value={form.closed_at || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  name="notes"
                  value={form.notes || ""}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Catatan tentang lead ini..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Lead"}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                  onClick={() => { setShowModal(false); setEditingId(null); setForm({ status: "New Lead" }); setModalClientQuery(""); setModalShowClientDropdown(false); }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingLead && (() => {
        const vc = clients.find(c => c.id === viewingLead.client_id);
        const priorityColors: Record<string, string> = {
          low: "bg-gray-100 text-gray-600", medium: "bg-blue-100 text-blue-700",
          high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Detail Lead</h2>
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" onClick={() => setViewingLead(null)}>✕</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
                    <p className="text-sm font-semibold text-gray-900">{vc?.name || "-"}</p>
                    {vc?.phone && <p className="text-xs text-gray-400">{vc.phone}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Status</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[viewingLead.status] || "bg-gray-100 text-gray-700"}`}>{viewingLead.status}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Priority</p>
                    {viewingLead.priority
                      ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[viewingLead.priority] || "bg-gray-100 text-gray-600"}`}>{viewingLead.priority}</span>
                      : <p className="text-sm text-gray-800">-</p>}
                  </div>
                  {[
                    { label: "Source", value: viewingLead.source || vc?.source },
                    { label: "Follow Up Date", value: viewingLead.follow_up_date?.slice(0, 10) },
                    { label: "Last Contacted At", value: viewingLead.last_contacted_at?.slice(0, 10) },
                    { label: "Closed At", value: viewingLead.closed_at?.slice(0, 10) },
                    { label: "Updated At", value: viewingLead.updated_at?.slice(0, 10) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                      <p className="text-sm text-gray-800">{value || "-"}</p>
                    </div>
                  ))}
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Catatan</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewingLead.notes || "-"}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button className="px-4 py-2 text-sm font-medium bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition" onClick={() => { setViewingLead(null); handleEdit(viewingLead); }}>Edit</button>
                  <button className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition" onClick={() => setViewingLead(null)}>Tutup</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus Lead?</h3>
            <p className="text-sm text-gray-500 mb-5">Data lead ini akan dihapus permanen.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={saving} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {saving ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeletingId(null); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
