"use client";
import Link from "next/link";
import { useState } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/components/Toast";
import type { InvoiceStatus } from "@/types/db";
import {
  addInvoice,
  deleteInvoice,
  generateInvoiceNumber,
  updateInvoice,
} from "@/services/invoices";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/usePagination";

const formatCurrency = (v?: number) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(v);

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Terkirim",
  partial: "Sebagian",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
};

export default function InvoicesTable() {
  const { invoices, loading, refetch } = useInvoices();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { user } = useAuth();
  const toast = useToast();

  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "">("");
  const [filterClientId, setFilterClientId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const defaultDueDate = (() => {
    const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10);
  })();

  const [form, setForm] = useState({
    client_id: "",
    project_id: "",
    total_amount: "",
    invoice_date: today,
    due_date: defaultDueDate,
    notes: "",
    status: "draft" as InvoiceStatus,
  });

  // Project belum lunas: total paid_amount semua invoice-nya < project.value
  const paidPerProject = invoices.reduce<Record<string, number>>((acc, inv) => {
    if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.paid_amount;
    return acc;
  }, {});
  const unpaidProjects = projects.filter(
    (p) => !p.value || (paidPerProject[p.id] ?? 0) < p.value
  );

  const filtered = invoices.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterClientId && inv.client_id !== filterClientId) return false;
    return true;
  });

  const { page, totalPages, paged, goTo } = usePagination(filtered, 20);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.total_amount) return;
    setSaving(true);
    try {
      const selectedProject = projects.find((p) => p.id === form.project_id);
      const invoice_number = await generateInvoiceNumber();
      await addInvoice({
        invoice_number,
        client_id: selectedProject?.client_id || form.client_id || undefined,
        project_id: form.project_id || undefined,
        total_amount: parseFloat(form.total_amount),
        status: form.status,
        invoice_date: form.invoice_date || undefined,
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
        created_by: user?.id,
      });
      await refetch();
      setShowAdd(false);
      setForm({ client_id: "", project_id: "", total_amount: "", invoice_date: today, due_date: defaultDueDate, notes: "", status: "draft" });
      toast("Invoice berhasil dibuat", "success");
    } catch (err: unknown) {
      toast(`Gagal membuat invoice: ${(err as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: InvoiceStatus) {
    try {
      await updateInvoice(id, { status });
      await refetch();
      toast("Status diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteInvoice(id);
      await refetch();
      toast("Invoice dihapus", "success");
    } catch (err: unknown) {
      toast(`Gagal menghapus: ${(err as Error).message}`, "error");
    } finally {
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
            <p className={`text-base font-bold mt-0.5 ${c.color}`}>{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as InvoiceStatus | ""); goTo(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Semua Status</option>
          {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterClientId}
          onChange={(e) => { setFilterClientId(e.target.value); goTo(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Semua Client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
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
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {inv.due_date ? new Date(inv.due_date).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className={outstanding > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(inv.paid_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[inv.status]}`}
                      >
                        {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          Detail
                        </Link>
                        <button
                          onClick={() => setDeletingId(inv.id)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        >
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
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>{filtered.length} invoice</span>
          <div className="flex gap-1">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  page === i + 1 ? "bg-gray-900 text-white" : "hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <span>Hal. {page} / {totalPages}</span>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Buat Invoice Baru</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Project *</label>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  required
                >
                  <option value="">Pilih project…</option>
                  {unpaidProjects.map((p) => {
                    const client = clients.find((c) => c.id === p.client_id);
                    const paid = paidPerProject[p.id] ?? 0;
                    const sisa = (p.value ?? 0) - paid;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}{client ? ` — ${client.name}` : ""}{p.value ? ` (sisa ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(sisa)})` : ""}
                      </option>
                    );
                  })}
                </select>
                {unpaidProjects.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Semua project sudah lunas.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Total Tagihan (IDR) *</label>
                <input
                  type="number"
                  value={form.total_amount}
                  onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="0"
                  required
                  min="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Invoice *</label>
                  <input
                    type="date"
                    value={form.invoice_date}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      d.setDate(d.getDate() + 14);
                      setForm((f) => ({ ...f, invoice_date: e.target.value, due_date: d.toISOString().slice(0, 10) }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Jatuh Tempo (14 hari)</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Catatan tambahan…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Menyimpan…" : "Buat Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeletingId(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Hapus Invoice?</h3>
            <p className="text-xs text-gray-500 mb-5">Semua data pembayaran terkait juga akan dihapus.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
