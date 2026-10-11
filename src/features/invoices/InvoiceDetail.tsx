"use client";
import { useState } from "react";
import Link from "next/link";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useAllRabs, useApprovedRabTotals } from "@/hooks/useRab";
import { useLeads } from "@/hooks/useLeads";
import { formatRupiah, formatIDR } from "@/utils/format";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import { useToast } from "@/components/Toast";
import type { InvoiceStatus, PaymentMethod } from "@/types/db";
import ActivityTimeline from "@/components/ActivityTimeline";
import { addPayment, deletePayment, updateInvoice } from "@/services/invoices";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
import type { Rab } from "@/types/db";
import { NumberInput } from "@/components/NumberInput";

const formatCurrency = (v?: number) =>
  v == null
    ? "—"
    : formatIDR(v);

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "tone-neutral",
  sent: "tone-active",
  partial: "tone-warning",
  paid: "tone-success",
  overdue: "tone-danger",
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
  const { leads } = useLeads();
  const { totals: rabTotals } = useApprovedRabTotals();
  const toast = useToast();

  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);

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
    rab_id: invoice?.rab_id ?? "",
    total_amount: String(invoice?.total_amount ?? ""),
    invoice_date: invoice?.invoice_date ?? invoice?.created_at?.slice(0, 10) ?? "",
    due_date: invoice?.due_date ?? "",
    notes: invoice?.notes ?? "",
    status: (invoice?.status ?? "draft") as InvoiceStatus,
    diskon_persen: String(invoice?.diskon_persen ?? ""),
    diskon_nilai: String(invoice?.diskon_nilai ?? ""),
  });
  const [editAvailableRabs, setEditAvailableRabs] = useState<Rab[]>([]);
  const [editRabTotal, setEditRabTotal] = useState<number | null>(null);
  const [loadingEditRabs, setLoadingEditRabs] = useState(false);

  async function openEdit() {
    setEditForm({
      project_id: invoice?.project_id ?? "",
      client_id: invoice?.client_id ?? "",
      rab_id: invoice?.rab_id ?? "",
      total_amount: String(invoice?.total_amount ?? ""),
      invoice_date: invoice?.invoice_date ?? invoice?.created_at?.slice(0, 10) ?? "",
      due_date: invoice?.due_date ?? "",
      notes: invoice?.notes ?? "",
      status: (invoice?.status ?? "draft") as InvoiceStatus,
      diskon_persen: String(invoice?.diskon_persen ?? ""),
      diskon_nilai: String(invoice?.diskon_nilai ?? ""),
    });
    setEditAvailableRabs([]);
    setEditRabTotal(null);

    // load RABs for current project
    const proj = projects.find((p) => p.id === invoice?.project_id);
    if (proj) {
      setLoadingEditRabs(true);
      try {
        const all: Rab[] = [];
        if (proj.lead_id) {
          const r = await getRabByLead(proj.lead_id);
          all.push(...r.filter((x) => x.status === "approved"));
        } else {
          const dealLeads = leads.filter((l) => l.client_id === proj.client_id && l.status === "Deal Won");
          for (const l of dealLeads) {
            const r = await getRabByLead(l.id);
            all.push(...r.filter((x) => x.status === "approved"));
          }
        }
        setEditAvailableRabs(all);
        // fetch total for currently linked RAB
        if (invoice?.rab_id) {
          const groups = await getRabWithGroups(invoice.rab_id);
          const total = groups.reduce((s, g) => s + (g.items ?? []).reduce((ss, it) => ss + it.qty * it.harga, 0), 0);
          setEditRabTotal(total);
        }
      } catch {
        toast("Gagal memuat RAB", "error");
      } finally {
        setLoadingEditRabs(false);
      }
    }
    setShowEdit(true);
  }

  async function handleEditProjectChange(projectId: string) {
    setEditForm((f) => ({ ...f, project_id: projectId, rab_id: "" }));
    setEditRabTotal(null);
    setEditAvailableRabs([]);
    if (!projectId) return;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;
    setLoadingEditRabs(true);
    try {
      const all: Rab[] = [];
      if (proj.lead_id) {
        const r = await getRabByLead(proj.lead_id);
        all.push(...r.filter((x) => x.status === "approved"));
      } else {
        const dealLeads = leads.filter((l) => l.client_id === proj.client_id && l.status === "Deal Won");
        for (const l of dealLeads) {
          const r = await getRabByLead(l.id);
          all.push(...r.filter((x) => x.status === "approved"));
        }
      }
      setEditAvailableRabs(all);
    } catch {
      toast("Gagal memuat RAB", "error");
    } finally {
      setLoadingEditRabs(false);
    }
  }

  async function handleEditRabChange(rabId: string) {
    setEditForm((f) => ({ ...f, rab_id: rabId }));
    setEditRabTotal(null);
    if (!rabId) return;
    try {
      const groups = await getRabWithGroups(rabId);
      const total = groups.reduce((s, g) => s + (g.items ?? []).reduce((ss, it) => ss + it.qty * it.harga, 0), 0);
      setEditRabTotal(total);
    } catch {
      toast("Gagal memuat total RAB", "error");
    }
  }

  function handleEditDiskonPersen(value: string) {
    const persen = parseFloat(value) || 0;
    const base = editRabTotal ?? 0;
    const nilai = base > 0 ? Math.round(base * persen / 100) : 0;
    setEditForm((f) => ({ ...f, diskon_persen: value, diskon_nilai: nilai > 0 ? String(nilai) : "" }));
  }

  function handleEditDiskonNilai(value: string) {
    const nilai = parseFloat(value) || 0;
    const base = editRabTotal ?? 0;
    const persen = base > 0 ? ((nilai / base) * 100).toFixed(1) : "";
    setEditForm((f) => ({ ...f, diskon_nilai: value, diskon_persen: persen }));
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
        rab_id: editForm.rab_id || undefined,
        total_amount: parseFloat(editForm.total_amount),
        invoice_date: editForm.invoice_date || undefined,
        due_date: editForm.due_date || undefined,
        notes: editForm.notes || undefined,
        status: editForm.status,
        diskon_persen: parseFloat(editForm.diskon_persen) || undefined,
        diskon_nilai: parseFloat(editForm.diskon_nilai) || undefined,
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
    (p) => p.id === invoice?.project_id || !getProjectValue(p) || (paidPerProject[p.id] ?? 0) < getProjectValue(p)
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
        <div className="h-8 bg-hover rounded-md w-64" />
        <div className="h-40 bg-hover rounded-md" />
        <div className="h-64 bg-hover rounded-md" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16 text-sm text-faint">
        Invoice tidak ditemukan.{" "}
        <Link href="/invoices" className="text-ink underline">Kembali</Link>
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
            <Link href="/invoices" className="text-xs text-faint hover:text-muted transition-colors">
              ← Invoice
            </Link>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{invoice.invoice_number}</h1>
          <p className="text-sm text-muted mt-0.5">
            {project ? <><span className="font-medium text-ink">{project.name}</span>{client && <span className="text-faint"> · {client.name}</span>}</> : (client?.name ?? "—")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted bg-white border border-line rounded-md hover:bg-hover transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <Link
            href={`/invoices/${invoiceId}/print`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted bg-white border border-line rounded-md hover:bg-hover transition-colors"
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
      <div className="bg-white rounded-md border border-line p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted mb-0.5">Total Tagihan</p>
            <p className="text-sm font-semibold text-ink">{formatCurrency(invoice.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Terbayar</p>
            <p className="text-sm font-semibold text-success">{formatCurrency(invoice.paid_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Outstanding</p>
            <p className={`text-sm font-semibold ${outstanding > 0 ? "text-danger" : "text-success"}`}>
              {formatCurrency(outstanding)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 pt-3 border-t border-line">
          <div>
            <p className="text-xs text-muted mb-0.5">Tanggal Invoice</p>
            <p className="text-sm font-medium text-ink">
              {invoice.invoice_date
                ? new Date(invoice.invoice_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : invoice.created_at
                ? new Date(invoice.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted mb-0.5">Jatuh Tempo</p>
            <p className="text-sm font-medium text-ink">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-faint mb-1">
            <span>Progress Pembayaran</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-hover rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? "bg-success" : "bg-accent"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {invoice.notes && (
          <p className="text-xs text-muted mt-3 pt-3 border-t border-line">{invoice.notes}</p>
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
          <div className="bg-accent-soft rounded-md border border-accent/25 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-accent">RAB Terkait</p>
                <p className="text-sm font-medium text-accent mt-0.5">{rab?.nama ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-accent">Total RAB</p>
                <p className="text-sm font-semibold text-accent">{formatRupiah(rabTotal)}</p>
                <p className="text-xs text-accent">Terbayar: {formatRupiah(rabPaid)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {siblings.map((sib) => (
                <Link
                  key={sib.id}
                  href={`/invoices/${sib.id}`}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-md border border-accent/25 hover:border-accent/25 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-ink group-hover:text-accent-hover">{sib.invoice_number}</span>
                    {sib.notes && <span className="text-xs text-faint truncate max-w-[160px]">{sib.notes.split(" · ")[0]}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-ink">{formatRupiah(sib.total_amount)}</span>
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
      <div className="bg-white rounded-md border border-line overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Riwayat Pembayaran</h2>
          <button
            onClick={() => setShowAddPayment(true)}
            disabled={invoice.status === "paid"}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-md hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Pembayaran
          </button>
        </div>

        {loadingPayments ? (
          <div className="py-8 text-center text-xs text-faint">Memuat…</div>
        ) : payments.length === 0 ? (
          <div className="py-10 text-center text-sm text-faint">Belum ada pembayaran tercatat</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted">Tanggal</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted">Jumlah</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden sm:table-cell">Metode</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted hidden md:table-cell">Catatan</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-3 text-ink">
                    {new Date(p.payment_date).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-success">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-muted hidden sm:table-cell">
                    {METHOD_LABELS[p.payment_method]}
                  </td>
                  <td className="px-4 py-3 text-faint text-xs hidden md:table-cell">
                    {p.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeletingPaymentId(p.id)}
                      className="text-xs text-danger hover:text-danger transition-colors"
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
            className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-ink">Tambah Pembayaran</h2>
              <button onClick={() => setShowAddPayment(false)} className="text-faint hover:text-muted transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Jumlah (IDR) *</label>
                <NumberInput
                  value={paymentForm.amount}
                  onValueChange={(v) => setPaymentForm((f) => ({ ...f, amount: v }))}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  placeholder={`Max: ${formatCurrency(outstanding)}`}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Tanggal Pembayaran *</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Metode Pembayaran</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                >
                  {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                    <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Catatan</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  placeholder="Misal: DP 30%, Termin 1…"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-muted bg-hover rounded-md hover:bg-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
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
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-line">
              <h2 className="text-base font-semibold text-ink">Edit Invoice</h2>
              <button onClick={() => setShowEdit(false)} className="text-faint hover:text-muted transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-5">
              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Project</label>
                <select
                  value={editForm.project_id}
                  onChange={(e) => handleEditProjectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
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

              {/* RAB */}
              {editForm.project_id && (
                <div>
                  <label className="block text-xs font-medium text-ink mb-1.5">
                    RAB (opsional)
                    {loadingEditRabs && <span className="ml-2 text-faint">Memuat…</span>}
                  </label>
                  {editAvailableRabs.length === 0 && !loadingEditRabs ? (
                    <p className="text-xs text-faint py-1">Tidak ada RAB disetujui untuk project ini.</p>
                  ) : (
                    <select
                      value={editForm.rab_id}
                      onChange={(e) => handleEditRabChange(e.target.value)}
                      className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                    >
                      <option value="">— Tanpa RAB —</option>
                      {editAvailableRabs.map((r) => (
                        <option key={r.id} value={r.id}>{r.nama}</option>
                      ))}
                    </select>
                  )}
                  {editRabTotal != null && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between bg-surface rounded-md px-3 py-2">
                        <span className="text-xs text-muted">Total RAB</span>
                        <span className="text-sm font-semibold text-ink">{formatRupiah(editRabTotal)}</span>
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs text-muted shrink-0">Diskon</span>
                        <div className="relative w-24">
                          <input
                            type="number" value={editForm.diskon_persen} onChange={(e) => handleEditDiskonPersen(e.target.value)}
                            placeholder="0" min="0" max="100" step="0.1"
                            className="w-full pl-2.5 pr-7 py-1.5 border border-line-strong rounded-md text-xs text-ink outline-none focus:ring-1 focus:ring-accent/25"
                          />
                          <span className="absolute right-2 top-1.5 text-xs text-faint">%</span>
                        </div>
                        <NumberInput
                          value={editForm.diskon_nilai} onValueChange={handleEditDiskonNilai}
                          placeholder="Rp"
                          className="flex-1 px-2.5 py-1.5 border border-line-strong rounded-md text-xs text-ink outline-none focus:ring-1 focus:ring-accent/25"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tanggal Invoice */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Tanggal Invoice</label>
                <input
                  type="date"
                  value={editForm.invoice_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, invoice_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                />
              </div>

              {/* Termin: tagihan + jatuh tempo + riwayat pembayaran */}
              <div>
                <label className="block text-xs font-medium text-ink mb-2">Termin Pembayaran</label>
                <div className="p-3 border border-line rounded-md bg-surface space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted mb-1">Total Tagihan (Rp) *</p>
                      <NumberInput
                        value={editForm.total_amount}
                        onValueChange={(v) => setEditForm((f) => ({ ...f, total_amount: v }))}
                        className="w-full px-2.5 py-1.5 border border-line-strong rounded-md text-xs text-ink outline-none focus:ring-1 focus:ring-accent/25"
                        required
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Jatuh Tempo</p>
                      <input
                        type="date"
                        value={editForm.due_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-line-strong rounded-md text-xs text-ink outline-none focus:ring-1 focus:ring-accent/25"
                      />
                    </div>
                  </div>

                  {/* Payment history */}
                  {payments.length > 0 && (
                    <div className="pt-2 border-t border-line">
                      <p className="text-xs font-medium text-muted mb-1.5">Riwayat Pembayaran</p>
                      <div className="space-y-1">
                        {payments.map((p) => (
                          <div key={p.id} className="flex items-center justify-between text-xs bg-white rounded px-2.5 py-1.5 border border-line">
                            <span className="text-muted">{new Date(p.payment_date).toLocaleDateString("id-ID")}</span>
                            <span className="text-faint hidden sm:block">{METHOD_LABELS[p.payment_method]}</span>
                            <span className="font-medium text-success">{formatRupiah(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-semibold mt-1.5 px-2.5">
                        <span className="text-muted">Total terbayar</span>
                        <span className="text-success">{formatRupiah(invoice.paid_amount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                >
                  {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1.5">Catatan</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25 resize-none"
                  placeholder="Catatan tambahan…"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-muted bg-hover rounded-md hover:bg-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
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
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink mb-2">Hapus Pembayaran?</h3>
            <p className="text-xs text-muted mb-5">Status invoice akan dihitung ulang secara otomatis.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPaymentId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-muted bg-hover rounded-md hover:bg-hover transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeletePayment(deletingPaymentId)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-danger rounded-md hover:bg-danger/90 transition-colors"
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
