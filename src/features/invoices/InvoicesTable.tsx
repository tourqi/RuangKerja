"use client";
import Link from "next/link";
import { useState } from "react";
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
import { InvoiceFormModal } from "./InvoiceFormModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export default function InvoicesTable() {
  const { invoices, loading, refetch } = useInvoices();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { leads } = useLeads();
  const { rabs } = useAllRabs();
  const { totals: rabTotals } = useApprovedRabTotals();
  const { user } = useAuth();

  const getProjectValue = (p: { lead_id?: string; value?: number }) =>
    p.lead_id && rabTotals[p.lead_id] != null ? rabTotals[p.lead_id] : (p.value ?? 0);
  const toast = useToast();

  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterClientId, setFilterClientId] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
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
    return true;
  });

  const { page, totalPages, paged, goTo } = usePagination(filtered, 20);

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
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Tagihan", value: totalTagihan, color: "text-gray-900" },
          { label: "Total Lunas", value: totalLunas, color: "text-green-600" },
          { label: "Outstanding", value: totalOutstanding, color: "text-red-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-base font-bold mt-0.5 ${c.color}`}>{formatRupiah(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <MultiSelect
          placeholder="Semua Status"
          options={toOptions(INVOICE_STATUSES, INVOICE_STATUS_LABELS)}
          value={filterStatus}
          onChange={(v) => { setFilterStatus(v); goTo(1); }}
          className="w-44"
        />
        <MultiSelect
          placeholder="Semua Client"
          options={clients.map((c) => ({ value: c.id, label: c.name ?? c.id }))}
          value={filterClientId}
          onChange={(v) => { setFilterClientId(v); goTo(1); }}
          className="w-52"
        />
        <div className="ml-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">No. Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Project / Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">RAB</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tgl Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Jatuh Tempo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Terbayar</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paged.map((inv: import("@/types/db").Invoice) => {
                const client = clients.find((c) => c.id === inv.client_id);
                const outstanding = inv.total_amount - inv.paid_amount;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
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
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          Detail
                        </Link>
                        <Link
                          href={`/invoices/${inv.id}/print`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          Cetak
                        </Link>
                        <button
                          onClick={() => setDeletingId(inv.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Halaman {page} dari {totalPages} · {filtered.length} invoice</span>
          <div className="flex gap-1">
            <button
              onClick={() => goTo(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-2 py-1.5">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p as number)}
                    className={`px-3 py-1.5 rounded-lg border transition ${
                      page === p ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => goTo(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}

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
