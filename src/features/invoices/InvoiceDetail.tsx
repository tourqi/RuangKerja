"use client";
import { useState } from "react";
import Link from "next/link";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useAllRabs } from "@/hooks/useRab";
import { formatRupiah } from "@/utils/format";
import { useToast } from "@/components/Toast";
import type { InvoiceStatus, PaymentMethod } from "@/types/db";
import ActivityTimeline from "@/components/ActivityTimeline";
import { addPayment, deletePayment, updateInvoice } from "@/services/invoices";

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

const METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: "Transfer Bank",
  cash: "Tunai",
  check: "Cek",
};

export default function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { invoices, loading: loadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { payments, loading: loadingPayments, refetch: refetchPayments } = usePayments(invoiceId);
  const { clients } = useClients();
  const { projects } = useProjects();
  const { rabs } = useAllRabs();
  const toast = useToast();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "transfer" as PaymentMethod,
    notes: "",
  });

  const invoice = invoices.find((i) => i.id === invoiceId);
  const client = clients.find((c) => c.id === invoice?.client_id);
  const project = projects.find((p) => p.id === invoice?.project_id);

  const [editForm, setEditForm] = useState({
    project_id: invoice?.project_id ?? "",
    client_id: invoice?.client_id ?? "",
    total_amount: String(invoice?.total_amount ?? ""),
    invoice_date: invoice?.invoice_date ?? invoice?.created_at?.slice(0, 10) ?? "",
    due_date: invoice?.due_date ?? "",
    notes: invoice?.notes ?? "",
    status: (invoice?.status ?? "draft") as InvoiceStatus,
  });

  function openEdit() {
    setEditForm({
      project_id: invoice?.project_id ?? "",
      client_id: invoice?.client_id ?? "",
      total_amount: String(invoice?.total_amount ?? ""),
      invoice_date: invoice?.invoice_date ?? invoice?.created_at?.slice(0, 10) ?? "",
      due_date: invoice?.due_date ?? "",
      notes: invoice?.notes ?? "",
      status: (invoice?.status ?? "draft") as InvoiceStatus,
    });
    setShowEdit(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    setSaving(true);
    try {
      const selectedProject = projects.find((p) => p.id === editForm.project_id);
      await updateInvoice(invoiceId, {
        project_id: editForm.project_id || undefined,
        client_id: selectedProject?.client_id || editForm.client_id || undefined,
        total_amount: parseFloat(editForm.total_amount),
        invoice_date: editForm.invoice_date || undefined,
        due_date: editForm.due_date || undefined,
        notes: editForm.notes || undefined,
        status: editForm.status,
      });
      await refetchInvoices();
      setShowEdit(false);
      toast("Invoice diperbarui", "success");
    } catch (err: unknown) {
      toast(`Gagal: ${(err as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  // Project yang belum lunas (untuk dropdown) — sertakan project invoice ini sendiri meski sudah lunas
  const paidPerProject = invoices.reduce<Record<string, number>>((acc, inv) => {
    if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.paid_amount;
    return acc;
  }, {});
  const editableProjects = projects.filter(
    (p) => p.id === invoice?.project_id || !p.value || (paidPerProject[p.id] ?? 0) < p.value
  );

  const loading = loadingInvoices;

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || !paymentForm.amount) return;
    setSaving(true);
    try {
      await addPayment({
        invoice_id: invoiceId,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes || undefined,
      });
      await Promise.all([refetchInvoices(), refetchPayments()]);
      setShowAddPayment(false);
      setPaymentForm({ amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "transfer", notes: "" });
      toast("Pembayaran berhasil dicatat", "success");
    } catch (err: unknown) {
      toast(`Gagal: ${(err as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(id: string) {
    try {
      await deletePayment(id, invoiceId);
      await Promise.all([refetchInvoices(), refetchPayments()]);
      toast("Pembayaran dihapus", "success");
    } catch (err: unknown) {
      toast(`Gagal: ${(err as Error).message}`, "error");
    } finally {
      setDeletingPaymentId(null);
    }
  }

  async function handleStatusChange(status: InvoiceStatus) {
    if (!invoice) return;
    try {
      await updateInvoice(invoiceId, { status });
      await refetchInvoices();
      toast("Status diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-xl w-64" />
        <div className="h-40 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        Invoice tidak ditemukan.{" "}
        <Link href="/invoices" className="text-gray-700 underline">Kembali</Link>
      </div>
    );
  }

  const outstanding = invoice.total_amount - invoice.paid_amount;
  const progressPct = invoice.total_amount > 0
    ? Math.min(100, (invoice.paid_amount / invoice.total_amount) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/invoices" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Invoice
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {project ? <><span className="font-medium text-gray-700">{project.name}</span>{client && <span className="text-gray-400"> · {client.name}</span>}</> : (client?.name ?? "—")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <Link
            href={`/invoices/${invoiceId}/print`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak
          </Link>
          <select
            value={invoice.status}
            onChange={(e) => handleStatusChange(e.target.value as InvoiceStatus)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLORS[invoice.status]}`}
          >
          {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
          </select>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total Tagihan</p>
            <p className="text-sm font-bold text-gray-900">{formatCurrency(invoice.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Terbayar</p>
            <p className="text-sm font-bold text-green-600">{formatCurrency(invoice.paid_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Outstanding</p>
            <p className={`text-sm font-bold ${outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(outstanding)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 pt-3 border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Tanggal Invoice</p>
            <p className="text-sm font-medium text-gray-700">
              {invoice.invoice_date
                ? new Date(invoice.invoice_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : invoice.created_at
                ? new Date(invoice.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Jatuh Tempo</p>
            <p className="text-sm font-medium text-gray-700">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Progress Pembayaran</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {invoice.notes && (
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">{invoice.notes}</p>
        )}
      </div>

      {/* Sibling invoices from same RAB */}
      {invoice.rab_id && (() => {
        const rab = rabs.find((r) => r.id === invoice.rab_id);
        const siblings = invoices.filter((i) => i.rab_id === invoice.rab_id && i.id !== invoiceId);
        if (siblings.length === 0) return null;
        const rabTotal = invoices.filter((i) => i.rab_id === invoice.rab_id).reduce((s, i) => s + i.total_amount, 0);
        const rabPaid = invoices.filter((i) => i.rab_id === invoice.rab_id).reduce((s, i) => s + i.paid_amount, 0);
        return (
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">RAB Terkait</p>
                <p className="text-sm font-medium text-blue-900 mt-0.5">{rab?.nama ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-500">Total RAB</p>
                <p className="text-sm font-bold text-blue-900">{formatRupiah(rabTotal)}</p>
                <p className="text-xs text-blue-600">Terbayar: {formatRupiah(rabPaid)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {siblings.map((sib) => (
                <Link
                  key={sib.id}
                  href={`/invoices/${sib.id}`}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700">{sib.invoice_number}</span>
                    {sib.notes && <span className="text-xs text-gray-400 truncate max-w-[160px]">{sib.notes.split(" · ")[0]}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">{formatRupiah(sib.total_amount)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[sib.status]}`}>
                      {STATUS_LABELS[sib.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Payment log */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Riwayat Pembayaran</h2>
          <button
            onClick={() => setShowAddPayment(true)}
            disabled={invoice.status === "paid"}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pembayaran
          </button>
        </div>

        {loadingPayments ? (
          <div className="py-8 text-center text-xs text-gray-400">Memuat…</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">Belum ada pembayaran tercatat</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tanggal</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jumlah</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Metode</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Catatan</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(p.payment_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {METHOD_LABELS[p.payment_method]}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {p.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeletingPaymentId(p.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActivityTimeline entityType="invoice" entityId={invoiceId} />

      {/* Add payment modal */}
      {showAddPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAddPayment(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Tambah Pembayaran</h2>
              <button onClick={() => setShowAddPayment(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Jumlah (IDR) *</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder={`Max: ${formatCurrency(outstanding)}`}
                  required
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Metode Pembayaran</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Misal: DP 30%, Termin 1…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Menyimpan…" : "Catat Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit invoice modal */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900">Edit Invoice</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Project</label>
                <select
                  value={editForm.project_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, project_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Tidak terhubung ke project</option>
                  {editableProjects.map((p) => {
                    const c = clients.find((cl) => cl.id === p.client_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}{c ? ` — ${c.name}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Total Tagihan (IDR) *</label>
                <input
                  type="number"
                  value={editForm.total_amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, total_amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  required
                  min="0"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Invoice</label>
                  <input
                    type="date"
                    value={editForm.invoice_date}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      d.setDate(d.getDate() + 14);
                      setEditForm((f) => ({ ...f, invoice_date: e.target.value, due_date: d.toISOString().slice(0, 10) }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                >
                  {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Catatan tambahan…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete payment confirm */}
      {deletingPaymentId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setDeletingPaymentId(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Hapus Pembayaran?</h3>
            <p className="text-xs text-gray-500 mb-5">Status invoice akan dihitung ulang secara otomatis.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPaymentId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeletePayment(deletingPaymentId)}
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
