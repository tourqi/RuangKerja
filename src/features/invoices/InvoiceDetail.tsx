"use client";
import { useState } from "react";
import Link from "next/link";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useClients } from "@/hooks/useClients";
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
  const toast = useToast();

  const [showAddPayment, setShowAddPayment] = useState(false);
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
          <p className="text-sm text-gray-500 mt-0.5">{client?.name ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Jatuh Tempo</p>
            <p className="text-sm font-medium text-gray-700">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("id-ID") : "—"}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Metode Pembayaran</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-gray-900"
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
