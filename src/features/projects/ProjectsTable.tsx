"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { addProject, updateProject, deleteProject } from "@/services/projects";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
import { Project, ProjectStatus, projectStatusLabel } from "@/types/db";
import { useToast } from "@/components/Toast";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { exportCSV } from "@/utils/csv";

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

const statusOptions: ProjectStatus[] = ["Planning", "Design", "Production", "Installation", "Done"];

const statusColors: Record<ProjectStatus, string> = {
  Planning: "bg-gray-100 text-gray-700",
  Design: "bg-blue-100 text-blue-800",
  Production: "bg-yellow-100 text-yellow-800",
  Installation: "bg-purple-100 text-purple-800",
  Done: "bg-green-100 text-green-800",
};

const formatRupiah = (value?: number) => {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

const PROJECT_COLUMNS: (keyof Project)[] = [
  "client_id", "name", "value", "status", "start_date", "deadline", "assigned_to", "progress",
];

export default function ProjectsTable() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const { projects, loading, error, refetch } = useProjects();
  const { clients } = useClients();
  const { leads } = useLeads();
  const [form, setForm] = useState<Partial<Project>>({ status: "Planning", progress: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalClientQuery, setModalClientQuery] = useState("");
  const [modalShowClientDropdown, setModalShowClientDropdown] = useState(false);

  // --- FILTER STATE ---
  const [filterName, setFilterName] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterStartFrom, setFilterStartFrom] = useState("");
  const [filterStartTo, setFilterStartTo] = useState("");
  const [filterDeadlineFrom, setFilterDeadlineFrom] = useState("");
  const [filterDeadlineTo, setFilterDeadlineTo] = useState("");
  const [filterProgressMin, setFilterProgressMin] = useState("");
  const [filterProgressMax, setFilterProgressMax] = useState("");

  const resetFilters = () => {
    setFilterName(""); setFilterClient(""); setFilterStatus("");
    setFilterAssigned(""); setFilterStartFrom(""); setFilterStartTo("");
    setFilterDeadlineFrom(""); setFilterDeadlineTo("");
    setFilterProgressMin(""); setFilterProgressMax("");
  };

  // hanya client yang leads-nya Deal (WON)
  const wonClientIds = new Set((leads || []).filter(l => l.status === "Deal").map(l => l.client_id));
  const wonClients = (clients || []).filter(c => wonClientIds.has(c.id));

  // --- FILTERED PROJECTS ---
  const filteredProjects = (projects || []).filter(p => {
    if (filterName && !p.name?.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterClient) {
      const c = (clients || []).find(cl => cl.id === p.client_id);
      if (!c?.name?.toLowerCase().includes(filterClient.toLowerCase())) return false;
    }
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterAssigned && !p.assigned_to?.toLowerCase().includes(filterAssigned.toLowerCase())) return false;
    if (filterStartFrom && p.start_date && p.start_date < filterStartFrom) return false;
    if (filterStartTo && p.start_date && p.start_date > filterStartTo) return false;
    if (filterDeadlineFrom && p.deadline && p.deadline < filterDeadlineFrom) return false;
    if (filterDeadlineTo && p.deadline && p.deadline > filterDeadlineTo) return false;
    if (filterProgressMin !== "" && (p.progress ?? 0) < Number(filterProgressMin)) return false;
    if (filterProgressMax !== "" && (p.progress ?? 0) > Number(filterProgressMax)) return false;
    return true;
  });

  const enrichedProjects = filteredProjects.map((p) => ({
    ...p,
    client_name: (clients || []).find((c) => c.id === p.client_id)?.name ?? "",
  }));

  const { sorted: sortedProjects, sortKey, sortDir, toggleSort } = useSortable(enrichedProjects);
  const { paged: pagedProjects, page, goTo, pageSize, changePageSize, totalPages, from, to, total } = usePagination(sortedProjects);

  const handleExport = () => {
    exportCSV(
      sortedProjects.map((p) => ({
        "Nama Project": p.name,
        Klien: p.client_name,
        Nilai: p.value ?? "",
        Status: projectStatusLabel[p.status] ?? p.status,
        "Start Date": p.start_date?.slice(0, 10) ?? "",
        Deadline: p.deadline?.slice(0, 10) ?? "",
        "Assigned To": p.assigned_to ?? "",
        "Progress (%)": p.progress ?? 0,
        Dibuat: p.created_at?.slice(0, 10) ?? "",
      })),
      "projects"
    );
  };

  const resetForm = () => {
    setForm({ status: "Planning", progress: 0 });
    setModalClientQuery("");
    setModalShowClientDropdown(false);
  };

  useEffect(() => {
    const clientId = searchParams.get("client_id");
    const leadId = searchParams.get("lead_id");
    if (!clientId || clients.length === 0) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    setForm({ status: "Planning", progress: 0, client_id: client.id });
    setModalClientQuery(client.name ?? "");
    setEditingId(null);
    setShowModal(true);

    if (leadId) {
      (async () => {
        try {
          const rabs = await getRabByLead(leadId);
          const approvedRabs = rabs.filter((r) => r.status === "approved");
          let total = 0;
          for (const rab of approvedRabs) {
            const groups = await getRabWithGroups(rab.id);
            const gross = groups.reduce(
              (s, g) => s + (g.items ?? []).reduce((gs, item) => gs + item.qty * item.harga, 0),
              0
            );
            total += gross - (rab.diskon_nilai ?? 0);
          }
          if (total > 0) {
            setForm((prev) => ({ ...prev, value: total }));
          }
        } catch {
          // silently ignore; user can fill value manually
        }
      })();
    }
  }, [searchParams, clients]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === "value" || name === "progress" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  const buildPayload = () => {
    const payload = Object.fromEntries(
      PROJECT_COLUMNS
        .filter(k => form[k] !== undefined && form[k] !== "")
        .map(k => [k, form[k]])
    ) as Omit<Project, "id" | "created_at">;
    payload.status = (form.status || "Planning") as ProjectStatus;
    return payload;
  };

  const handleAdd = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name) { toast("Nama project wajib diisi", "warning"); return; }
    setSaving(true);
    try {
      await addProject(buildPayload());
      resetForm();
      setShowModal(false);
      refetch();
      toast("Project berhasil ditambahkan", "success");
    } catch (err: unknown) {
      const pg = err as { message?: string };
      toast(`Gagal menambah project: ${pg?.message || "Terjadi kesalahan"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setForm(project);
    const clientName = (clients || []).find(c => c.id === project.client_id)?.name ?? "";
    setModalClientQuery(clientName);
    setShowModal(true);
  };

  const handleUpdate = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateProject(editingId, buildPayload());
      setEditingId(null);
      resetForm();
      setShowModal(false);
      refetch();
      toast("Project berhasil diperbarui", "success");
    } catch (err: unknown) {
      const pg = err as { message?: string };
      toast(`Gagal update project: ${pg?.message || "Terjadi kesalahan"}`, "error");
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
      await deleteProject(deletingId);
      refetch();
      toast("Project berhasil dihapus", "success");
    } catch {
      toast("Gagal hapus project", "error");
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
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={9} />)}
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
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{filteredProjects.length} project</p>
          <p className="text-sm font-semibold text-green-700">
            Total: {formatRupiah(filteredProjects.reduce((sum, p) => sum + (p.value ?? 0), 0))}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition font-medium"
            onClick={handleExport}
          >
            ↓ Export CSV
          </button>
          <button
            className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-medium"
            onClick={() => { setEditingId(null); resetForm(); setShowModal(true); }}
          >
            + Tambah Project
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mb-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            placeholder="Cari nama project..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
          />
          <input
            type="text"
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            placeholder="Cari nama client..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none"
          >
            <option value="">Semua Status</option>
            {statusOptions.map(s => <option key={s} value={s}>{projectStatusLabel[s]}</option>)}
          </select>
          <input
            type="text"
            value={filterAssigned}
            onChange={e => setFilterAssigned(e.target.value)}
            placeholder="Assigned to..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <div className="flex items-center gap-2">
              <input type="date" value={filterStartFrom} onChange={e => setFilterStartFrom(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none" />
              <span className="text-gray-400 shrink-0">—</span>
              <input type="date" value={filterStartTo} onChange={e => setFilterStartTo(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Deadline</label>
            <div className="flex items-center gap-2">
              <input type="date" value={filterDeadlineFrom} onChange={e => setFilterDeadlineFrom(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none" />
              <span className="text-gray-400 shrink-0">—</span>
              <input type="date" value={filterDeadlineTo} onChange={e => setFilterDeadlineTo(e.target.value)} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Progress (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} value={filterProgressMin} onChange={e => setFilterProgressMin(e.target.value)} placeholder="Min" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none" />
              <span className="text-gray-400 shrink-0">—</span>
              <input type="number" min={0} max={100} value={filterProgressMax} onChange={e => setFilterProgressMax(e.target.value)} placeholder="Max" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={resetFilters} className="px-4 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Reset Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800">Daftar Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <SortableHeader label="Nama Project" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Client" col="client_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Nilai Project" col="value" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Start Date" col="start_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Deadline" col="deadline" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Assigned To" col="assigned_to" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Progress" col="progress" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedProjects.map((project) => {
                const client = clients.find((c) => c.id === project.client_id);
                const progress = project.progress ?? 0;
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{project.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{client?.name || "-"}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{formatRupiah(project.value)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                        {projectStatusLabel[project.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{project.start_date ? project.start_date.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{project.deadline ? project.deadline.slice(0, 10) : "-"}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{project.assigned_to || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1.5">
                        <Link
                          href={`/projects/${project.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Lihat
                        </Link>
                        <button
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition"
                          onClick={() => handleEdit(project)}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                          onClick={() => confirmDelete(project.id)}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Belum ada project. Klik "Tambah Project" untuk memulai.
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Project" : "Tambah Project Baru"}
              </h2>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                onClick={() => { setShowModal(false); setEditingId(null); resetForm(); }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="px-6 py-5 space-y-4">
              {/* Nama Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project <span className="text-red-500">*</span></label>
                <input
                  name="name"
                  value={form.name || ""}
                  onChange={handleChange}
                  required
                  placeholder="Nama project"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Client autocomplete */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client (Lead Deal)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={modalClientQuery}
                    onChange={(e) => {
                      setModalClientQuery(e.target.value);
                      setModalShowClientDropdown(true);
                      setForm(prev => ({ ...prev, client_id: "" }));
                    }}
                    onFocus={() => setModalShowClientDropdown(true)}
                    onBlur={() => setTimeout(() => setModalShowClientDropdown(false), 150)}
                    placeholder="Cari nama client..."
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {modalShowClientDropdown && (
                    <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow max-h-48 overflow-y-auto">
                      {wonClients
                        .filter(c => !modalClientQuery || c.name?.toLowerCase().includes(modalClientQuery.toLowerCase()))
                        .length === 0 ? (
                        <div className="px-3 py-2 text-gray-400 text-sm">
                          {wonClients.length === 0 ? "Belum ada lead dengan status Deal." : "Tidak ditemukan"}
                        </div>
                      ) : (
                        wonClients
                          .filter(c => !modalClientQuery || c.name?.toLowerCase().includes(modalClientQuery.toLowerCase()))
                          .map(c => (
                            <div
                              key={c.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-green-50 text-sm ${form.client_id === c.id ? "bg-green-100" : ""}`}
                              onMouseDown={() => {
                                setForm(prev => ({ ...prev, client_id: c.id }));
                                setModalClientQuery(c.name ?? "");
                                setModalShowClientDropdown(false);
                              }}
                            >
                              {c.name}
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
                {form.client_id && (
                  <p className="text-xs text-green-600 mt-1">✓ Client dipilih</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nilai Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Project (Rp)</label>
                  <input
                    name="value"
                    value={form.value ?? ""}
                    onChange={handleChange}
                    type="number"
                    min={0}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                  <select
                    name="status"
                    value={form.status || "Planning"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{projectStatusLabel[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    name="start_date"
                    value={form.start_date || ""}
                    onChange={handleChange}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Deadline */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    name="deadline"
                    value={form.deadline || ""}
                    onChange={handleChange}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Assigned To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    name="assigned_to"
                    value={form.assigned_to || ""}
                    onChange={handleChange}
                    placeholder="Nama tim / PIC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Progress */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progress <span className="text-gray-400 font-normal">({form.progress ?? 0}%)</span>
                  </label>
                  <input
                    name="progress"
                    value={form.progress ?? 0}
                    onChange={handleChange}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    className="w-full accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Project"}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                  onClick={() => { setShowModal(false); setEditingId(null); resetForm(); }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus Project?</h3>
            <p className="text-sm text-gray-500 mb-5">Data project ini akan dihapus permanen.</p>
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
