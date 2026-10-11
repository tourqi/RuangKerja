"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { deleteProject } from "@/services/projects";
import { Project } from "@/types/db";
import { useToast } from "@/components/Toast";
import { SortableHeader } from "@/components/SortableHeader";
import { useSortable } from "@/hooks/useSortable";
import { usePagination } from "@/hooks/usePagination";
import Pagination from "@/components/Pagination";
import { exportCSV } from "@/utils/csv";
import { useApprovedRabTotals } from "@/hooks/useRab";
import { useInvoices } from "@/hooks/useInvoices";
import { MultiSelect } from "@/components/MultiSelect";
import { ActionDropdown } from "@/components/ActionDropdown";
import { MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardIconButton, EyeIcon, PencilIcon, TrashIcon } from "@/components/MobileCard";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  toOptions,
} from "@/constants/options";
import { formatRupiah, formatDate } from "@/utils/format";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import { ProjectFormModal } from "./ProjectFormModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

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


export default function ProjectsTable() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projects, loading, error, refetch } = useProjects();
  const { clients } = useClients();
  const { leads } = useLeads();
  const { totals: rabTotals } = useApprovedRabTotals();
  const { invoices } = useInvoices();

  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);

  // Berdasarkan invoice project itu sendiri, bukan lewat RAB — invoice bisa dibuat
  // tanpa RAB sama sekali, jadi tidak boleh cuma mengecek invoice yang terhubung ke RAB.
  const getPaymentStatus = (projectId: string): 'lunas' | 'belum' | null => {
    const projectInvoices = (invoices || []).filter(inv => inv.project_id === projectId);
    if (projectInvoices.length === 0) return null;
    return projectInvoices.every(inv => inv.status === 'paid') ? 'lunas' : 'belum';
  };
  const [editingProject, setEditingProject] = useState<Project | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [autoClientId, setAutoClientId] = useState<string | null>(null);
  const [autoLeadId, setAutoLeadId] = useState<string | null>(null);

  // --- FILTER STATE ---
  const [filterName, setFilterName] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterStartFrom, setFilterStartFrom] = useState("");
  const [filterStartTo, setFilterStartTo] = useState("");
  const [filterDeadlineFrom, setFilterDeadlineFrom] = useState("");
  const [filterDeadlineTo, setFilterDeadlineTo] = useState("");
  const [filterProgressMin, setFilterProgressMin] = useState("");
  const [filterProgressMax, setFilterProgressMax] = useState("");

  const resetFilters = () => {
    setFilterName(""); setFilterClient(""); setFilterStatus([]);
    setFilterAssigned(""); setFilterStartFrom(""); setFilterStartTo("");
    setFilterDeadlineFrom(""); setFilterDeadlineTo("");
    setFilterProgressMin(""); setFilterProgressMax("");
  };

  // hanya client yang leads-nya Deal (WON)
  const wonClientIds = new Set((leads || []).filter(l => l.status === "Deal Won").map(l => l.client_id));
  const wonClients = (clients || []).filter(c => wonClientIds.has(c.id));

  // --- FILTERED PROJECTS ---
  const filteredProjects = (projects || []).filter(p => {
    if (filterName && !p.name?.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterClient) {
      const c = (clients || []).find(cl => cl.id === p.client_id);
      if (!c?.name?.toLowerCase().includes(filterClient.toLowerCase())) return false;
    }
    if (filterStatus.length > 0 && !filterStatus.includes(p.status)) return false;
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
        Nilai: getProjectValue(p),
        Status: PROJECT_STATUS_LABELS[p.status] ?? p.status,
        "Start Date": formatDate(p.start_date),
        Deadline: formatDate(p.deadline),
        "Assigned To": p.assigned_to ?? "",
        "Progress (%)": p.progress ?? 0,
        Dibuat: formatDate(p.created_at),
      })),
      "projects"
    );
  };

  useEffect(() => {
    const clientId = searchParams.get("client_id");
    const leadId = searchParams.get("lead_id");
    if (!clientId || clients.length === 0) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    setAutoClientId(clientId);
    setAutoLeadId(leadId);
    setEditingProject(null);
    setShowModal(true);
  }, [searchParams, clients]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setAutoClientId(null);
    setAutoLeadId(null);
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
      await deleteProject(deletingId);
      refetch();
      toast("Project berhasil dihapus", "success");
    } catch (err: unknown) {
      toast(`Gagal hapus project: ${(err as Error).message ?? "Terjadi kesalahan"}`, "error");
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
            {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={10} />)}
          </tbody>
        </table>
      </div>
    );

  if (error)
    return <div className="bg-danger-soft border border-danger-line rounded-md p-4 text-danger text-sm">Error: {error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted">{filteredProjects.length} project</p>
          <p className="text-sm font-semibold text-success">
            Total: {formatRupiah(filteredProjects.reduce((sum, p) => sum + getProjectValue(p), 0))}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-2.5 py-1.5 border border-line bg-white text-ink text-[13px] rounded-md hover:bg-hover transition-colors font-medium"
            onClick={handleExport}
          >
            ↓ Export CSV
          </button>
          <button
            className="px-2.5 py-1.5 bg-accent text-white text-[13px] rounded-md hover:bg-accent-hover transition font-medium"
            onClick={() => { setEditingProject(null); setAutoClientId(null); setAutoLeadId(null); setShowModal(true); }}
          >
            + Tambah Project
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-md border border-line p-4 mb-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            placeholder="Cari nama project..."
            className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink placeholder:text-faint focus:ring-2 focus:ring-accent/25 outline-none"
          />
          <input
            type="text"
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            placeholder="Cari nama client..."
            className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink placeholder:text-faint focus:ring-2 focus:ring-accent/25 outline-none"
          />
          <MultiSelect
            placeholder="Semua Status"
            options={toOptions(PROJECT_STATUSES, PROJECT_STATUS_LABELS)}
            value={filterStatus}
            onChange={setFilterStatus}
          />
          <input
            type="text"
            value={filterAssigned}
            onChange={e => setFilterAssigned(e.target.value)}
            placeholder="Assigned to..."
            className="px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink placeholder:text-faint focus:ring-2 focus:ring-accent/25 outline-none"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Start Date</label>
            <div className="flex items-center gap-2">
              <input type="date" value={filterStartFrom} onChange={e => setFilterStartFrom(e.target.value)} className="flex-1 min-w-0 px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 outline-none" />
              <span className="text-faint shrink-0">—</span>
              <input type="date" value={filterStartTo} onChange={e => setFilterStartTo(e.target.value)} className="flex-1 min-w-0 px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Deadline</label>
            <div className="flex items-center gap-2">
              <input type="date" value={filterDeadlineFrom} onChange={e => setFilterDeadlineFrom(e.target.value)} className="flex-1 min-w-0 px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 outline-none" />
              <span className="text-faint shrink-0">—</span>
              <input type="date" value={filterDeadlineTo} onChange={e => setFilterDeadlineTo(e.target.value)} className="flex-1 min-w-0 px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Progress (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} value={filterProgressMin} onChange={e => setFilterProgressMin(e.target.value)} placeholder="Min" className="flex-1 min-w-0 px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 outline-none" />
              <span className="text-faint shrink-0">—</span>
              <input type="number" min={0} max={100} value={filterProgressMax} onChange={e => setFilterProgressMax(e.target.value)} placeholder="Max" className="flex-1 min-w-0 px-2.5 py-1.5 border border-line rounded-md text-[13px] text-ink focus:ring-2 focus:ring-accent/25 outline-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={resetFilters} className="px-4 py-1.5 text-[13px] text-muted border border-line rounded-md hover:bg-hover transition">
            Reset Filter
          </button>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white rounded-md border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead className="bg-surface border-b border-line">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap w-10"><span className="sr-only">Aksi</span></th>
                <SortableHeader label="Nama Project" col="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Client" col="client_name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Nilai Project" col="value" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Start Date" col="start_date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Deadline" col="deadline" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Assigned To" col="assigned_to" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader label="Progress" col="progress" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap">Status Pembayaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pagedProjects.map((project) => {
                const client = clients.find((c) => c.id === project.client_id);
                const progress = project.progress ?? 0;
                return (
                  <tr key={project.id} className="hover:bg-hover transition-colors cursor-pointer" onDoubleClick={() => router.push(`/projects/${project.id}`)}>
                    <td className="px-3 py-2 whitespace-nowrap" onDoubleClick={(e) => e.stopPropagation()}>
                      <ActionDropdown
                        align="left"
                        items={[
                          {
                            key: "detail",
                            label: "Lihat Detail",
                            href: `/projects/${project.id}`,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ),
                          },
                          {
                            key: "edit",
                            label: "Edit",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            ),
                            onClick: () => handleEdit(project),
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            danger: true,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ),
                            onClick: () => confirmDelete(project.id),
                          },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-ink whitespace-nowrap">{project.name}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{client?.name || "-"}</td>
                    <td className="px-3 py-2 text-ink font-medium whitespace-nowrap">{formatRupiah(getProjectValue(project))}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}>
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(project.start_date)}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(project.deadline)}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{project.assigned_to || "-"}</td>
                    <td className="px-3 py-2 whitespace-nowrap min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-line rounded-full h-1.5">
                          <div
                            className="bg-success h-1.5 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted w-8 text-right">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {(() => {
                        const ps = getPaymentStatus(project.id);
                        if (ps === null) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-hover text-muted">Belum Ada Invoice</span>;
                        if (ps === 'lunas') return <span className="px-2 py-0.5 rounded-full text-xs font-medium tone-success">Lunas</span>;
                        return <span className="px-2 py-0.5 rounded-full text-xs font-medium tone-danger">Belum Lunas</span>;
                      })()}
                    </td>
                  </tr>
                );
              })}
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-faint text-sm">
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

      {/* Cards (mobile) */}
      <div className="sm:hidden">
        <MobileCardList>
          {pagedProjects.map((project) => {
            const client = clients.find((c) => c.id === project.client_id);
            const progress = project.progress ?? 0;
            const ps = getPaymentStatus(project.id);
            return (
              <MobileCard key={project.id} onClick={() => router.push(`/projects/${project.id}`)}>
                <MobileCardHeader
                  title={project.name}
                  subtitle={<span className="text-xs text-faint">{client?.name || "-"}</span>}
                  actions={
                    <>
                      <MobileCardIconButton title="Lihat Detail" onClick={() => router.push(`/projects/${project.id}`)}><EyeIcon /></MobileCardIconButton>
                      <MobileCardIconButton title="Edit" onClick={() => handleEdit(project)}><PencilIcon /></MobileCardIconButton>
                      <MobileCardIconButton title="Hapus" danger onClick={() => confirmDelete(project.id)}><TrashIcon /></MobileCardIconButton>
                    </>
                  }
                />
                <MobileCardRow label="Nilai Project">{formatRupiah(getProjectValue(project))}</MobileCardRow>
                <MobileCardRow label="Status">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJECT_STATUS_COLORS[project.status]}`}>
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                </MobileCardRow>
                <MobileCardRow label="Start Date">{formatDate(project.start_date)}</MobileCardRow>
                <MobileCardRow label="Deadline">{formatDate(project.deadline)}</MobileCardRow>
                <MobileCardRow label="Assigned To">{project.assigned_to || "-"}</MobileCardRow>
                <MobileCardRow label="Progress">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-16 bg-line rounded-full h-1.5 overflow-hidden">
                      <span className="block bg-success h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                    </span>
                    {progress}%
                  </span>
                </MobileCardRow>
                <MobileCardRow label="Status Pembayaran">
                  {ps === null ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-hover text-muted">Belum Ada Invoice</span>
                  ) : ps === "lunas" ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium tone-success">Lunas</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium tone-danger">Belum Lunas</span>
                  )}
                </MobileCardRow>
              </MobileCard>
            );
          })}
          {filteredProjects.length === 0 && (
            <div className="py-12 text-center text-faint text-sm bg-white rounded-lg border border-line">
              Belum ada project. Klik &quot;Tambah Project&quot; untuk memulai.
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
        <ProjectFormModal
          project={editingProject}
          wonClients={wonClients}
          autoClientId={autoClientId}
          autoLeadId={autoLeadId}
          onSaved={() => { setShowModal(false); setEditingProject(undefined); refetch(); }}
          onClose={() => { setShowModal(false); setEditingProject(undefined); }}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          title="Hapus Project?"
          description="Data project ini akan dihapus permanen."
          saving={saving}
          onConfirm={handleDelete}
          onClose={() => { setShowDeleteModal(false); setDeletingId(null); }}
        />
      )}
    </div>
  );
}
