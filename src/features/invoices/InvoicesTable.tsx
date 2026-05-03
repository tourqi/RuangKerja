"use client";
import Link from "next/link";
import { useState } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useLeads } from "@/hooks/useLeads";
import { useToast } from "@/components/Toast";
import type { InvoiceStatus, Rab } from "@/types/db";
import {
  addInvoice,
  deleteInvoice,
  generateInvoiceNumber,
  updateInvoice,
} from "@/services/invoices";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
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

type Termin = {
  id: string;
  nama: string;
  persen: string;
  jumlah: string;
  due_date: string;
};

function newTermin(idx: number): Termin {
  const d = new Date(); d.setDate(d.getDate() + 14 * (idx + 1));
  return { id: crypto.randomUUID(), nama: "", persen: "", jumlah: "", due_date: d.toISOString().slice(0, 10) };
}

export default function InvoicesTable() {
  const { invoices, loading, refetch } = useInvoices();
  const { clients } = useClients();
  const { projects } = useProjects();
  const { leads } = useLeads();
  const { user } = useAuth();
  const toast = useToast();

  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | "">("");
  const [filterClientId, setFilterClientId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({ project_id: "", invoice_date: today, notes: "" });
  const [availableRabs, setAvailableRabs] = useState<Rab[]>([]);
  const [selectedRabId, setSelectedRabId] = useState("");
  const [rabTotal, setRabTotal] = useState<number | null>(null);
  const [loadingRabs, setLoadingRabs] = useState(false);
  const [termins, setTermins] = useState<Termin[]>([newTermin(0)]);
  const [diskon, setDiskon] = useState({ persen: "", nilai: "" });

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

  async function handleProjectChange(projectId: string) {
    setForm((f) => ({ ...f, project_id: projectId }));
    setSelectedRabId("");
    setRabTotal(null);
    setAvailableRabs([]);
    if (!projectId) return;

    const project = projects.find((p) => p.id === projectId);
    if (!project?.client_id) return;

    setLoadingRabs(true);
    try {
      const dealLeads = leads.filter((l) => l.client_id === project.client_id && l.status === "Deal");
      const allRabs: Rab[] = [];
      for (const lead of dealLeads) {
        const rabs = await getRabByLead(lead.id);
        allRabs.push(...rabs.filter((r) => r.status === "approved"));
      }
      setAvailableRabs(allRabs);
    } catch {
      toast("Gagal memuat RAB", "error");
    } finally {
      setLoadingRabs(false);
    }
  }

  async function handleRabChange(rabId: string) {
    setSelectedRabId(rabId);
    setRabTotal(null);
    if (!rabId) return;
    try {
      const groups = await getRabWithGroups(rabId);
      const total = groups.reduce((sum, g) => sum + (g.items ?? []).reduce((s, item) => s + item.qty * item.harga, 0), 0);
      setRabTotal(total);
      setTermins((prev) => prev.map((t) => ({ ...t, jumlah: "", persen: "" })));
    } catch {
      toast("Gagal memuat total RAB", "error");
    }
  }

  function updateTermin(id: string, field: keyof Termin, value: string) {
    setTermins((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      const base = effectiveRabTotal ?? rabTotal;
      if (base && base > 0) {
        if (field === "persen" && value !== "") {
          updated.jumlah = Math.round((parseFloat(value) / 100) * base).toString();
        } else if (field === "jumlah" && value !== "") {
          updated.persen = ((parseFloat(value) / base) * 100).toFixed(1);
        }
      }
      return updated;
    }));
  }

  const diskonNilaiNum = parseFloat(diskon.nilai) || 0;
  const effectiveRabTotal = rabTotal != null ? rabTotal - diskonNilaiNum : null;
  const totalTermin = termins.reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
  const sisaTagihan = effectiveRabTotal != null ? effectiveRabTotal - totalTermin : null;

  function handleDiskonPersenChange(value: string) {
    const persen = parseFloat(value) || 0;
    const nilai = rabTotal && rabTotal > 0 ? Math.round(rabTotal * persen / 100) : 0;
    setDiskon({ persen: value, nilai: nilai > 0 ? String(nilai) : "" });
  }

  function handleDiskonNilaiChange(value: string) {
    const nilai = parseFloat(value) || 0;
    const persen = rabTotal && rabTotal > 0 ? ((nilai / rabTotal) * 100).toFixed(1) : "";
    setDiskon({ nilai: value, persen: persen });
  }

  function resetAdd() {
    setForm({ project_id: "", invoice_date: today, notes: "" });
    setAvailableRabs([]);
    setSelectedRabId("");
    setRabTotal(null);
    setDiskon({ persen: "", nilai: "" });
    setTermins([newTermin(0)]);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.project_id) { toast("Pilih project terlebih dahulu", "warning"); return; }
    const validTermins = termins.filter((t) => t.nama && parseFloat(t.jumlah) > 0);
    if (validTermins.length === 0) { toast("Tambahkan minimal 1 termin dengan nama dan jumlah", "warning"); return; }

    setSaving(true);
    try {
      const project = projects.find((p) => p.id === form.project_id);
      for (const termin of validTermins) {
        const invoice_number = await generateInvoiceNumber();
        await addInvoice({
          invoice_number,
          client_id: project?.client_id || undefined,
          project_id: form.project_id,
          total_amount: parseFloat(termin.jumlah),
          status: "draft",
          invoice_date: form.invoice_date || undefined,
          due_date: termin.due_date || undefined,
          notes: [termin.nama, form.notes].filter(Boolean).join(" · ") || undefined,
          created_by: user?.id,
          diskon_persen: parseFloat(diskon.persen) || undefined,
          diskon_nilai: parseFloat(diskon.nilai) || undefined,
        });
      }
      await refetch();
      setShowAdd(false);
      resetAdd();
      toast(`${validTermins.length} invoice berhasil dibuat`, "success");
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
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Semua Status</option>
          {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterClientId}
          onChange={(e) => { setFilterClientId(e.target.value); goTo(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
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
          onClick={() => { setShowAdd(false); resetAdd(); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Buat Invoice</h2>
              <button onClick={() => { setShowAdd(false); resetAdd(); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAdd} className="px-6 py-5 space-y-5">
              {/* Step 1: Pilih Project */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Project *</label>
                <select
                  value={form.project_id}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  required
                >
                  <option value="">Pilih project…</option>
                  {unpaidProjects.map((p) => {
                    const client = clients.find((c) => c.id === p.client_id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name}{client ? ` — ${client.name}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 2: Pilih RAB (opsional) */}
              {form.project_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    RAB (opsional)
                    {loadingRabs && <span className="ml-2 text-gray-400">Memuat…</span>}
                  </label>
                  {availableRabs.length === 0 && !loadingRabs ? (
                    <p className="text-xs text-gray-400 py-2">Tidak ada RAB disetujui untuk project ini.</p>
                  ) : (
                    <select
                      value={selectedRabId}
                      onChange={(e) => handleRabChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="">— Tanpa RAB —</option>
                      {availableRabs.map((r) => (
                        <option key={r.id} value={r.id}>{r.nama}</option>
                      ))}
                    </select>
                  )}
                  {rabTotal != null && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-500">Total RAB</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(rabTotal)}</span>
                      </div>
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs text-gray-500 shrink-0">Diskon</span>
                        <div className="relative w-24">
                          <input
                            type="number"
                            value={diskon.persen}
                            onChange={(e) => handleDiskonPersenChange(e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full pl-2.5 pr-7 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                          />
                          <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                        </div>
                        <input
                          type="number"
                          value={diskon.nilai}
                          onChange={(e) => handleDiskonNilaiChange(e.target.value)}
                          placeholder="Rp"
                          min="0"
                          className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </div>
                      {diskonNilaiNum > 0 && (
                        <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                          <span className="text-xs text-blue-700">Total setelah diskon</span>
                          <span className="text-sm font-semibold text-blue-900">{formatCurrency(effectiveRabTotal ?? 0)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tanggal Invoice */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Invoice *</label>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>

              {/* Termin Builder */}
              {form.project_id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-700">Termin Pembayaran *</label>
                    {rabTotal != null && sisaTagihan != null && (
                      <span className={`text-xs font-medium ${Math.abs(sisaTagihan) < 1 ? "text-green-600" : sisaTagihan < 0 ? "text-red-500" : "text-orange-500"}`}>
                        Sisa: {formatCurrency(sisaTagihan)}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {termins.map((t, idx) => (
                      <div key={t.id} className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="col-span-2 md:col-span-1">
                            <input
                              type="text"
                              value={t.nama}
                              onChange={(e) => updateTermin(t.id, "nama", e.target.value)}
                              placeholder={idx === 0 ? "DP" : idx === termins.length - 1 ? "Pelunasan" : `Termin ${idx + 1}`}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                          <div>
                            <div className="relative">
                              <input
                                type="number"
                                value={t.persen}
                                onChange={(e) => updateTermin(t.id, "persen", e.target.value)}
                                placeholder="0"
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full pl-2.5 pr-7 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                              />
                              <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                            </div>
                          </div>
                          <div>
                            <input
                              type="number"
                              value={t.jumlah}
                              onChange={(e) => updateTermin(t.id, "jumlah", e.target.value)}
                              placeholder="Rp"
                              min="0"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                          <div>
                            <input
                              type="date"
                              value={t.due_date}
                              onChange={(e) => updateTermin(t.id, "due_date", e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTermins((prev) => prev.filter((x) => x.id !== t.id))}
                          disabled={termins.length === 1}
                          className="mt-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-20"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTermins((prev) => [...prev, newTermin(prev.length)])}
                    className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Tambah Termin
                  </button>
                  <div className="mt-2 text-xs text-gray-400">
                    <span className="font-medium text-gray-600">Kolom: </span> Nama · % · Jumlah (Rp) · Jatuh Tempo
                  </div>
                </div>
              )}

              {/* Catatan */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Catatan tambahan…"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); resetAdd(); }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Menyimpan…" : `Buat ${termins.filter((t) => t.nama && parseFloat(t.jumlah) > 0).length || ""} Invoice`}
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
