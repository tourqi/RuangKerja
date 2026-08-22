"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useLeads } from "@/hooks/useLeads";
import { useToast } from "@/components/Toast";
import { MultiSelect } from "@/components/MultiSelect";
import type { InvoiceStatus } from "@/types/db";
import { deleteInvoice, updateInvoice } from "@/services/invoices";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import { useAllRabs, useApprovedRabTotals } from "@/hooks/useRab";
import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  toOptions,
} from "@/constants/options";
import { formatRupiah } from "@/utils/format";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import { InvoiceFormModal } from "./InvoiceFormModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { ActionDropdown } from "@/components/ActionDropdown";
import Pagination from "@/components/Pagination";
import { MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardIconButton, EyeIcon, TrashIcon } from "@/components/MobileCard";

export default function InvoicesTable() {
  const router = useRouter();
  const { invoices, loading, refetch } = useInvoices();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { leads } = useLeads();
  const { rabs } = useAllRabs();
  const { totals: rabTotals } = useApprovedRabTotals();
  const { user } = useAuth();

  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);
  const toast = useToast();

  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterClientId, setFilterClientId] = useState<string[]>([]);
  const [filterProjectId, setFilterProjectId] = useState<string[]>([]);
  const [filterRabId, setFilterRabId] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const availableRabs = filterProjectId.length === 0
    ? rabs
    : (() => {
        const selectedLeadIds = new Set(
          projects.filter(p => filterProjectId.includes(p.id)).map(p => p.lead_id).filter(Boolean) as string[]
        );
        return rabs.filter(r => selectedLeadIds.has(r.lead_id));
      })();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const paidPerProject = invoices.reduce<Record<string, number>>((acc, inv) => {
    if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.paid_amount;
    return acc;
  }, {});
  const unpaidProjects = projects.filter(
    (p) => !getProjectValue(p) || (paidPerProject[p.id] ?? 0) < getProjectValue(p)
  );

  const filtered = invoices.filter((inv) => {
    if (filterStatus.length > 0 && !filterStatus.includes(inv.status)) return false;
    if (filterClientId.length > 0 && !filterClientId.includes(inv.client_id ?? "")) return false;
    if (filterProjectId.length > 0 && !filterProjectId.includes(inv.project_id ?? "")) return false;
    if (filterRabId.length > 0 && !filterRabId.includes(inv.rab_id ?? "")) return false;
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      const projectName = projects.find(p => p.id === inv.project_id)?.name?.toLowerCase() ?? "";
      const rabName = rabs.find(r => r.id === inv.rab_id)?.nama?.toLowerCase() ?? "";
      if (!projectName.includes(q) && !rabName.includes(q)) return false;
    }
    return true;
  });

  const { paged, page, goTo, pageSize, changePageSize, totalPages, from, to, total } = usePagination(filtered, 20);

  const handleProjectFilterChange = (v: string[]) => {
    setFilterProjectId(v);
    if (v.length > 0) {
      const newLeadIds = new Set(
        projects.filter(p => v.includes(p.id)).map(p => p.lead_id).filter(Boolean) as string[]
      );
      const validRabIds = new Set(rabs.filter(r => newLeadIds.has(r.lead_id)).map(r => r.id));
      setFilterRabId(prev => prev.filter(id => validRabIds.has(id)));
    }
    goTo(1);
  };

  async function handleStatusChange(id: string, status: InvoiceStatus) {
    try {
      await updateInvoice(id, { status });
      await refetch();
      toast("Status diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteInvoice(deletingId);
      await refetch();
      toast("Invoice dihapus", "success");
    } catch (err: unknown) {
      toast(`Gagal menghapus: ${(err as Error).message}`, "error");
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  }

  const totalTagihan = filtered.reduce((s, i) => s + i.total_amount, 0);
  const totalLunas = filtered.reduce((s, i) => s + i.paid_amount, 0);
  const totalOutstanding = totalTagihan - totalLunas;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola tagihan dan pembayaran klien</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        {[
          { label: "Total Tagihan", value: totalTagihan, color: "text-gray-900" },
          { label: "Total Lunas", value: totalLunas, color: "text-green-600" },
          { label: "Outstanding", value: totalOutstanding, color: "text-red-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-3 sm:px-4 py-2.5 sm:py-3 min-w-0">
            <p className="text-[11px] sm:text-xs text-gray-500 truncate">{c.label}</p>
            <p className={`text-sm sm:text-base font-bold mt-0.5 truncate ${c.color}`}>{formatRupiah(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 mb-4">
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filterSearch}
            onChange={e => { setFilterSearch(e.target.value); goTo(1); }}
            placeholder="Cari project / RAB..."
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 outline-none w-full sm:w-52"
          />
        </div>
        <MultiSelect
          placeholder="Semua Status"
          options={toOptions(INVOICE_STATUSES, INVOICE_STATUS_LABELS)}
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); goTo(1); }}
          className="w-full sm:w-44"
        />
        <MultiSelect
          placeholder="Semua Client"
          options={clients.map((c) => ({ value: c.id, label: c.name ?? c.id }))}
          value={filterClientId}
          onChange={(v) => { setFilterClientId(v); goTo(1); }}
          className="w-full sm:w-52"
        />
        <MultiSelect
          placeholder="Semua Project"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={filterProjectId}
          onChange={handleProjectFilterChange}
          className="w-full sm:w-52"
        />
        <MultiSelect
          placeholder={filterProjectId.length > 0 ? `RAB (${availableRabs.length})` : "Semua RAB"}
          options={availableRabs.map((r) => ({ value: r.id, label: r.nama }))}
          value={filterRabId}
          onChange={(v) => { setFilterRabId(v); goTo(1); }}
          className="w-full sm:w-52"
        />
        <div className="sm:ml-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Invoice
          </button>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 px-4 flex items-center gap-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-32" />
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="h-3 bg-gray-100 rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {filtered.length === 0 && invoices.length > 0 ? "Tidak ada invoice yang sesuai filter" : "Belum ada invoice"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">No. Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project / Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">RAB</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tgl Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Jatuh Tempo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Terbayar</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map((inv: import("@/types/db").Invoice) => {
                const client = clients.find((c) => c.id === inv.client_id);
                const outstanding = inv.total_amount - inv.paid_amount;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => router.push(`/invoices/${inv.id}`)}>
                    <td className="px-4 py-3" onDoubleClick={(e) => e.stopPropagation()}>
                      <ActionDropdown
                        align="left"
                        items={[
                          {
                            key: "detail",
                            label: "Detail",
                            href: `/invoices/${inv.id}`,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ),
                          },
                          {
                            key: "print",
                            label: "Cetak",
                            href: `/invoices/${inv.id}/print`,
                            target: "_blank",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            ),
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            danger: true,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ),
                            onClick: () => setDeletingId(inv.id),
                          },
                        ]}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-gray-900 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(() => {
                        const project = projects.find((p) => p.id === inv.project_id);
                        if (project) return <><span className="font-medium text-gray-800">{project.name}</span>{client && <span className="text-gray-400 text-xs ml-1">· {client.name}</span>}</>;
                        return client?.name ?? "—";
                      })()}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      {inv.rab_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-medium">
                          {rabs.find((r) => r.id === inv.rab_id)?.nama ?? "RAB"}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatRupiah(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className={outstanding > 0 ? "text-red-600" : "text-green-600"}>
                        {formatRupiah(inv.paid_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3" onDoubleClick={(e) => e.stopPropagation()}>
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${INVOICE_STATUS_COLORS[inv.status]}`}
                      >
                        {INVOICE_STATUSES.map((s) => (
                          <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
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

      {/* Cards (mobile) */}
      <div className="sm:hidden">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
            {filtered.length === 0 && invoices.length > 0 ? "Tidak ada invoice yang sesuai filter" : "Belum ada invoice"}
          </div>
        ) : (
          <>
            <MobileCardList>
              {paged.map((inv: import("@/types/db").Invoice) => {
                const client = clients.find((c) => c.id === inv.client_id);
                const project = projects.find((p) => p.id === inv.project_id);
                const outstanding = inv.total_amount - inv.paid_amount;
                return (
                  <MobileCard key={inv.id} onClick={() => router.push(`/invoices/${inv.id}`)}>
                    <MobileCardHeader
                      title={inv.invoice_number}
                      subtitle={
                        <span className="text-xs text-gray-400">
                          {project ? project.name : client?.name ?? "—"}
                          {project && client && <> · {client.name}</>}
                        </span>
                      }
                      actions={
                        <>
                          <MobileCardIconButton title="Detail" onClick={() => router.push(`/invoices/${inv.id}`)}><EyeIcon /></MobileCardIconButton>
                          <MobileCardIconButton title="Hapus" danger onClick={() => setDeletingId(inv.id)}><TrashIcon /></MobileCardIconButton>
                        </>
                      }
                    />
                    {inv.rab_id && (
                      <MobileCardRow label="RAB">
                        {rabs.find((r) => r.id === inv.rab_id)?.nama ?? "RAB"}
                      </MobileCardRow>
                    )}
                    <MobileCardRow label="Tgl Invoice">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("id-ID") : "—"}
                    </MobileCardRow>
                    <MobileCardRow label="Jatuh Tempo">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString("id-ID") : "—"}
                    </MobileCardRow>
                    <MobileCardRow label="Total">{formatRupiah(inv.total_amount)}</MobileCardRow>
                    <MobileCardRow label="Terbayar">
                      <span className={outstanding > 0 ? "text-red-600" : "text-green-600"}>
                        {formatRupiah(inv.paid_amount)}
                      </span>
                    </MobileCardRow>
                    <div className="flex items-center justify-between gap-3 pt-2 text-sm" onClick={(e) => e.stopPropagation()}>
                      <span className="text-gray-400">Status</span>
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${INVOICE_STATUS_COLORS[inv.status]}`}
                      >
                        {INVOICE_STATUSES.map((s) => (
                          <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>
                  </MobileCard>
                );
              })}
            </MobileCardList>
            <div className="mt-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
          </>
        )}
      </div>

      {showAdd && (
        <InvoiceFormModal
          projects={projects}
          clients={clients}
          leads={leads}
          unpaidProjects={unpaidProjects}
          userId={user?.id}
          onSaved={async () => { await refetch(); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {deletingId && (
        <DeleteConfirmModal
          title="Hapus Invoice?"
          description="Semua data pembayaran terkait juga akan dihapus."
          saving={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
