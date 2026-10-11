"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useCallback, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/context/AuthContext";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/services/expenses";
import { getInvoicesByProject, getPaymentsByInvoice } from "@/services/invoices";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
import { useToast } from "@/components/Toast";
import ActivityTimeline from "@/components/ActivityTimeline";
import { NumberInput } from "@/components/NumberInput";
import { InvoiceFormModal } from "@/features/invoices/InvoiceFormModal";
import type { ExpenseCategory, Invoice, Payment, ProjectExpense, Rab, RabGroup } from "@/types/db";
import { projectStatusLabel } from "@/types/db";
import { formatIDR } from "@/utils/format";
import { ProjectRabSection, rabGross } from "./ProjectRabSection";
import { DetailTabs, useTabParam } from "@/components/DetailTabs";
import { StatusDot, PROJECT_STATUS_TONE, INVOICE_STATUS_TONE } from "@/components/ui/StatusDot";

const TAB_KEYS = ["ringkasan", "rab", "pengeluaran", "tagihan"] as const;

const formatCurrency = (v: number) =>
  formatIDR(v);

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: "Material",
  jasa: "Jasa",
  transport: "Transport",
  lainnya: "Lainnya",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: "bg-surface text-ink",
  jasa: "bg-surface text-ink",
  transport: "bg-surface text-ink",
  lainnya: "bg-surface text-ink",
};

const INV_STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Terkirim", partial: "Sebagian", paid: "Lunas", overdue: "Jatuh Tempo",
};
const METHOD_LABELS: Record<string, string> = {
  transfer: "Transfer", cash: "Tunai", check: "Cek",
};

type LocalExpense = ProjectExpense & { _saving?: boolean };

const TODAY = new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 20;

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { projects, loading: lp } = useProjects();
  const { clients, loading: lc } = useClients();
  const { leads } = useLeads();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, "ringkasan");

  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [loadingExp, setLoadingExp] = useState(true);
  const [addingRow, setAddingRow] = useState(false);

  // Tagihan & Pembayaran
  const [projectInvoices, setProjectInvoices] = useState<Invoice[]>([]);
  const [paymentsByInvoice, setPaymentsByInvoice] = useState<Record<string, Payment[]>>({});
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [allRabs, setAllRabs] = useState<Rab[]>([]);
  const [rabGroups, setRabGroups] = useState<Record<string, RabGroup[]>>({});
  const [loadingRabs, setLoadingRabs] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Filters
  const [filterKategori, setFilterKategori] = useState<string>("");
  const [filterVendor, setFilterVendor] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);

  const loadExpenses = useCallback(() => {
    setLoadingExp(true);
    getExpenses(projectId)
      .then((data) => setExpenses(data))
      .catch(() => {})
      .finally(() => setLoadingExp(false));
  }, [projectId]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  // Load invoices + payments for this project
  const loadInvoicesData = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const invs = await getInvoicesByProject(projectId);
      setProjectInvoices(invs);
      // load payments for each invoice in parallel
      const entries = await Promise.all(
        invs.map(async (inv) => {
          const pays = await getPaymentsByInvoice(inv.id);
          return [inv.id, pays] as [string, Payment[]];
        })
      );
      setPaymentsByInvoice(Object.fromEntries(entries));
    } catch { /* silent */ } finally {
      setLoadingInvoices(false);
    }
  }, [projectId]);

  useEffect(() => { loadInvoicesData(); }, [loadInvoicesData]);

  // Load semua RAB (beserta isinya) dari lead project ini
  const leadId = projects.find((p) => p.id === projectId)?.lead_id;
  const loadRabs = useCallback(async () => {
    if (!leadId) { setLoadingRabs(false); return; }
    try {
      const rabs = await getRabByLead(leadId);
      const entries = await Promise.all(
        rabs.map(async (rab) => [rab.id, await getRabWithGroups(rab.id)] as [string, RabGroup[]])
      );
      setAllRabs(rabs);
      setRabGroups(Object.fromEntries(entries));
    } catch { /* silent */ } finally {
      setLoadingRabs(false);
    }
  }, [leadId]);

  useEffect(() => { loadRabs(); }, [loadRabs]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterKategori, filterVendor]);

  if (lp || lc) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-line border-t-ink" />
      </div>
    );
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition mb-6">
          <span>←</span> Kembali
        </button>
        <div className="bg-white rounded-md border border-line p-12 text-center">
          <p className="text-faint text-sm">Project tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === project.client_id);
  const progress = project.progress ?? 0;
  // Nilai project = total RAB yang sudah disetujui
  const approvedRabs = allRabs.filter((r) => r.status === "approved");
  const rabTotals: Record<string, number> = Object.fromEntries(
    approvedRabs.map((r) => [r.id, rabGross(rabGroups[r.id]) - (r.diskon_nilai ?? 0)])
  );
  const projectValue = Object.values(rabTotals).reduce((sum, v) => sum + v, 0);
  const totalPengeluaran = expenses.reduce((s, e) => s + e.jumlah, 0);
  const estimasiProfit = projectValue - totalPengeluaran;
  const marginPct = projectValue > 0 ? ((estimasiProfit / projectValue) * 100).toFixed(1) : null;

  // Unique vendors for filter dropdown
  const vendorOptions = Array.from(
    new Set(expenses.map((e) => e.vendor).filter(Boolean) as string[])
  ).sort();

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    if (filterKategori && e.kategori !== filterKategori) return false;
    if (filterVendor && e.vendor !== filterVendor) return false;
    return true;
  });

  const totalFiltered = filteredExpenses.reduce((s, e) => s + e.jumlah, 0);
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const pagedExpenses = filteredExpenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // --- Inline table handlers ---
  function updateLocal(id: string, field: keyof ProjectExpense, value: string | number) {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  }

  async function handleBlur(expense: LocalExpense, field: keyof ProjectExpense) {
    const value = expense[field];
    try {
      await updateExpense(expense.id, { [field]: value });
    } catch {
      toast("Gagal menyimpan perubahan", "error");
    }
  }

  async function handleAddRow() {
    setAddingRow(true);
    try {
      await addExpense({
        project_id: projectId,
        tanggal: TODAY,
        deskripsi: "",
        kategori: "material",
        jumlah: 0,
        vendor: undefined,
        notes: undefined,
      });
      loadExpenses();
    } catch (err: unknown) {
      toast(`Gagal: ${(err as Error)?.message ?? String(err)}`, "error");
    } finally {
      setAddingRow(false);
    }
  }

  async function handleDelete(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteExpense(id);
    } catch {
      toast("Gagal menghapus baris", "error");
      loadExpenses();
    }
  }

  const byKategori = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => ({
    key: k,
    label: CATEGORY_LABELS[k],
    color: CATEGORY_COLORS[k],
    total: expenses.filter((e) => e.kategori === k).reduce((s, e) => s + e.jumlah, 0),
  })).filter((k) => k.total > 0);

  const hasFilter = filterKategori !== "" || filterVendor !== "";

  // Pipeline: Lead → RAB disetujui → Project → Ditagih → Lunas
  const totalTagih = projectInvoices.reduce((s, i) => s + i.total_amount, 0);
  const totalBayar = projectInvoices.reduce((s, i) => s + i.paid_amount, 0);
  const belumBayar = totalTagih - totalBayar;
  const pipeline = [
    { label: "Lead", done: !!project.lead_id },
    { label: "RAB disetujui", done: approvedRabs.length > 0 },
    { label: `Project ${progress}%`, done: project.status === "Done" },
    { label: "Ditagih", done: projectValue > 0 && totalTagih >= projectValue },
    { label: "Lunas", done: totalTagih > 0 && totalBayar >= totalTagih && totalTagih >= projectValue },
  ];
  const currentStep = pipeline.findIndex((p) => !p.done);

  const today = new Date().toISOString().slice(0, 10);
  const deadlineLate = !!project.deadline && project.deadline < today && project.status !== "Done";
  const daysLate = (d: string) => Math.floor((Date.parse(today) - Date.parse(d.slice(0, 10))) / 86_400_000);
  const overdueInvoices = projectInvoices.filter(
    (i) => i.status !== "paid" && (i.status === "overdue" || (!!i.due_date && i.due_date.slice(0, 10) < today))
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-ink min-w-0 truncate">{project.name}</h1>
          <button
            onClick={() => { setActiveTab("tagihan"); setShowInvoiceModal(true); }}
            className="self-start px-2.5 py-1.5 text-[13px] font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors shrink-0"
          >
            + Invoice
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted">
          <StatusDot tone={PROJECT_STATUS_TONE[project.status] ?? "neutral"}>{projectStatusLabel[project.status]}</StatusDot>
          {client && (
            <span>Klien <Link href={`/clients/${client.id}`} className="text-ink font-medium hover:underline">{client.name}</Link></span>
          )}
          {project.assigned_to && <span>PIC <span className="text-ink font-medium">{project.assigned_to}</span></span>}
          {project.start_date && <span className="tabular-nums">Mulai <span className="text-ink font-medium">{formatDate(project.start_date)}</span></span>}
          {project.deadline && (
            <span className={`tabular-nums ${deadlineLate ? "text-danger" : ""}`}>
              Tenggat <span className={deadlineLate ? "font-medium" : "text-ink font-medium"}>{formatDate(project.deadline)}</span>
              {deadlineLate && ` · lewat ${daysLate(project.deadline)} hari`}
            </span>
          )}
        </div>
        <ol className="grid grid-cols-5 gap-1 pt-1" aria-label="Tahapan project">
          {pipeline.map((p, i) => (
            <li key={p.label} className={`grid gap-1.5 text-xs ${p.done || i === currentStep ? "text-ink" : "text-faint"} ${i === currentStep ? "font-medium" : ""}`}>
              <span className={`h-[3px] rounded-full ${p.done ? "bg-ink" : i === currentStep ? "bg-accent" : "bg-line"}`} />
              <span className="truncate">{p.label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Angka utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-line -mx-4 sm:-mx-6 lg:-mx-8 [&>div]:px-4 sm:[&>div]:px-6 lg:[&>div]:px-8">
        <div className="py-3 border-r border-line">
          <p className="text-xs text-muted">Nilai project</p>
          <p className="font-mono text-base font-medium tabular-nums text-ink mt-0.5">{projectValue ? formatCurrency(projectValue) : "—"}</p>
          <p className="text-[11.5px] text-faint mt-0.5">{approvedRabs.length} RAB disetujui</p>
        </div>
        <div className="py-3 lg:border-r border-line">
          <p className="text-xs text-muted">Pengeluaran</p>
          <p className="font-mono text-base font-medium tabular-nums text-ink mt-0.5">{formatCurrency(totalPengeluaran)}</p>
          <p className="text-[11.5px] text-faint mt-0.5">{expenses.length} transaksi</p>
        </div>
        <div className="py-3 border-r border-t lg:border-t-0 border-line">
          <p className="text-xs text-muted">Estimasi profit</p>
          <p className={`font-mono text-base font-medium tabular-nums mt-0.5 ${estimasiProfit < 0 ? "text-danger" : "text-ink"}`}>{formatCurrency(estimasiProfit)}</p>
          <p className="text-[11.5px] text-faint mt-0.5">{marginPct ? `Margin ${marginPct.replace(".", ",")}%` : "—"}</p>
        </div>
        <div className="py-3 border-t lg:border-t-0 border-line">
          <p className="text-xs text-muted">Belum dibayar</p>
          <p className={`font-mono text-base font-medium tabular-nums mt-0.5 ${belumBayar > 0 && overdueInvoices.length > 0 ? "text-danger" : "text-ink"}`}>{formatCurrency(belumBayar)}</p>
          <p className="text-[11.5px] text-faint mt-0.5">{overdueInvoices.length > 0 ? `${overdueInvoices.length} invoice lewat jatuh tempo` : `dari ${projectInvoices.length} invoice`}</p>
        </div>
      </div>

      {/* Hal yang butuh tindakan */}
      {overdueInvoices.map((inv) => (
        <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border border-danger-line bg-danger-soft text-[13px] text-ink">
          <StatusDot tone="danger">
            <span className="font-normal">
              {inv.invoice_number}{inv.notes ? ` · ${inv.notes}` : ""}
              {inv.due_date ? ` · jatuh tempo ${formatDate(inv.due_date)}, lewat ${daysLate(inv.due_date)} hari` : ""}
            </span>
          </StatusDot>
          <Link href={`/invoices/${inv.id}`} className="text-danger font-medium hover:underline">Catat pembayaran →</Link>
        </div>
      ))}

      <DetailTabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan" },
          { key: "rab", label: "RAB", count: allRabs.length },
          { key: "pengeluaran", label: "Pengeluaran", count: expenses.length },
          { key: "tagihan", label: "Tagihan & Pembayaran", count: projectInvoices.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "rab" && (
        <ProjectRabSection
          projectId={projectId}
          leadId={project.lead_id}
          rabs={allRabs}
          groupsByRab={rabGroups}
          invoices={projectInvoices}
          loading={loadingRabs}
          onChanged={loadRabs}
        />
      )}

      {activeTab === "ringkasan" && (<>
      {/* Informasi Project */}
      <div className="bg-white rounded-md border border-line p-6">
        <h2 className="text-sm font-semibold text-ink mb-4">Informasi Project</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">Client</p>
            <p className="text-sm text-ink">{client?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">Status</p>
            <p className="text-sm text-ink">{projectStatusLabel[project.status]}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">Assigned To</p>
            <p className="text-sm text-ink">{project.assigned_to ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">Start Date</p>
            <p className="text-sm text-ink">{formatDate(project.start_date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">Deadline</p>
            <p className="text-sm text-ink">{formatDate(project.deadline)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-faint mb-0.5">Nilai Project</p>
            <p className="text-sm font-semibold text-ink">{projectValue ? formatCurrency(projectValue) : "-"}</p>
          </div>
        </div>
      </div>

      <ActivityTimeline entityType="project" entityId={projectId} />
      </>)}

      {/* Pengeluaran */}
      {activeTab === "pengeluaran" && (
      <div className="space-y-4">

        {/* Summary chips */}
        {byKategori.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {byKategori.map((k) => (
              <button
                key={k.key}
                onClick={() => setFilterKategori(filterKategori === k.key ? "" : k.key)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  filterKategori === k.key
                    ? `${k.color} ring-2 ring-offset-1 ring-current`
                    : k.color
                }`}
              >
                {k.label} · {formatCurrency(k.total)}
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="px-3 py-1.5 text-xs border border-line rounded-md text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 bg-white"
          >
            <option value="">Semua Kategori</option>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
              <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
            ))}
          </select>

          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-3 py-1.5 text-xs border border-line rounded-md text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 bg-white"
          >
            <option value="">Semua Vendor</option>
            {vendorOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {hasFilter && (
            <button
              onClick={() => { setFilterKategori(""); setFilterVendor(""); }}
              className="px-3 py-1.5 text-xs text-faint hover:text-ink transition"
            >
              Reset filter
            </button>
          )}

          {hasFilter && (
            <span className="text-xs text-faint ml-1">
              {filteredExpenses.length} dari {expenses.length} baris
            </span>
          )}
        </div>

        {/* Inline table */}
        <div className="bg-white rounded-md border border-line overflow-hidden">
          {/* Add row button */}
          <div className="px-3 py-2 border-b border-line">
            <button
              onClick={handleAddRow}
              disabled={addingRow}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors disabled:opacity-50"
            >
              <span className="text-base leading-none">+</span>
              {addingRow ? "Menambahkan..." : "Tambah Baris"}
            </button>
          </div>
          <datalist id="vendor-options">
            {vendorOptions.map((v) => <option key={v} value={v} />)}
          </datalist>
          {loadingExp ? (
            <div className="py-10 text-center text-xs text-faint">Memuat...</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm border-collapse">
              <thead>
                <tr className="bg-surface border-b border-line">
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted w-28">Tanggal</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted">Deskripsi</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted w-28">Kategori</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-muted w-32">Vendor</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-muted w-36">Jumlah (IDR)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-faint">
                      {hasFilter ? "Tidak ada data sesuai filter." : "Belum ada pengeluaran. Klik \"+ Tambah Baris\" di atas."}
                    </td>
                  </tr>
                )}
                {pagedExpenses.map((exp) => (
                  <tr key={exp.id} className="group hover:bg-hover transition-colors">
                    {/* Tanggal */}
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={exp.tanggal}
                        onChange={(e) => updateLocal(exp.id, "tanggal", e.target.value)}
                        onBlur={() => handleBlur(exp, "tanggal")}
                        className="w-full px-2 py-1 text-xs text-ink bg-transparent border border-transparent rounded focus:outline-none focus:border-accent focus:bg-white transition"
                      />
                    </td>
                    {/* Deskripsi */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={exp.deskripsi}
                        placeholder="Deskripsi pengeluaran..."
                        onChange={(e) => updateLocal(exp.id, "deskripsi", e.target.value)}
                        onBlur={() => handleBlur(exp, "deskripsi")}
                        className="w-full px-2 py-1 text-sm text-ink bg-transparent border border-transparent rounded focus:outline-none focus:border-accent focus:bg-white transition placeholder-faint"
                      />
                    </td>
                    {/* Kategori */}
                    <td className="px-2 py-1.5">
                      <select
                        value={exp.kategori}
                        onChange={(e) => {
                          updateLocal(exp.id, "kategori", e.target.value);
                          updateExpense(exp.id, { kategori: e.target.value as ExpenseCategory }).catch(() => {
                            toast("Gagal menyimpan kategori", "error");
                          });
                        }}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent/25 ${CATEGORY_COLORS[exp.kategori]}`}
                      >
                        {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
                          <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                        ))}
                      </select>
                    </td>
                    {/* Vendor — datalist saran dari vendor yang sudah pernah diinput
                        di project ini (vendorOptions), tapi tetap bisa diketik bebas
                        kalau vendornya baru. */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        list="vendor-options"
                        value={exp.vendor ?? ""}
                        placeholder="—"
                        onChange={(e) => updateLocal(exp.id, "vendor", e.target.value)}
                        onBlur={() => handleBlur(exp, "vendor")}
                        className="w-full px-2 py-1 text-xs text-muted bg-transparent border border-transparent rounded focus:outline-none focus:border-accent focus:bg-white transition placeholder-faint"
                      />
                    </td>
                    {/* Jumlah */}
                    <td className="px-2 py-1.5">
                      <NumberInput
                        value={exp.jumlah || ""}
                        placeholder="0"
                        onValueChange={(v) => updateLocal(exp.id, "jumlah", v === "" ? 0 : Number(v))}
                        onBlur={() => handleBlur(exp, "jumlah")}
                        className="w-full px-2 py-1 text-sm text-right font-mono tabular-nums text-ink bg-transparent border border-transparent rounded focus:outline-none focus:border-accent focus:bg-white transition placeholder-faint"
                      />
                    </td>
                    {/* Delete */}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="w-6 h-6 flex items-center justify-center rounded text-faint hover:text-danger hover:bg-danger-soft opacity-0 group-hover:opacity-100 transition mx-auto"
                        title="Hapus baris"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filteredExpenses.length > 0 && (
                <tfoot>
                  <tr className="bg-surface border-t border-line">
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-medium text-muted">
                      {hasFilter ? "Total (difilter)" : "Total Pengeluaran"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums font-medium text-ink">
                      {formatCurrency(totalFiltered)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Halaman {page} dari {totalPages} · {filteredExpenses.length} data
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md border border-line hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
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
                    <span key={`ellipsis-${i}`} className="px-2 py-1.5">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`px-3 py-1.5 rounded-md border transition ${
                        page === p
                          ? "bg-accent text-white border-accent"
                          : "border-line hover:bg-hover"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-md border border-line hover:bg-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Tagihan & Pembayaran */}
      {activeTab === "tagihan" && (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors"
          >
            <span className="text-base leading-none">+</span>
            Tambah Invoice
          </button>
        </div>

        {/* RAB summary */}
        {approvedRabs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {approvedRabs.map((rab) => (
              <div key={rab.id} className="inline-flex items-center gap-2 text-xs border border-line text-ink px-2.5 py-1 rounded-md">
                <span>{rab.nama}</span>
                {rabTotals[rab.id] != null && (
                  <span className="font-mono tabular-nums text-muted">{formatCurrency(rabTotals[rab.id])}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Financial summary cards */}
        {(() => {
          const totalRab = Object.values(rabTotals).reduce((s, v) => s + v, 0);
          const totalTagih = projectInvoices.reduce((s, i) => s + i.total_amount, 0);
          const totalBayar = projectInvoices.reduce((s, i) => s + i.paid_amount, 0);
          const belumTagih = totalRab > 0 ? totalRab - totalTagih : null;
          const belumBayar = totalTagih - totalBayar;
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {totalRab > 0 && (
                <div className="bg-white rounded-md border border-line px-3 py-2">
                  <p className="text-xs text-faint mb-1">Total Nilai RAB</p>
                  <p className="font-mono text-sm font-medium tabular-nums text-ink">{formatCurrency(totalRab)}</p>
                </div>
              )}
              <div className="bg-white rounded-md border border-line px-3 py-2">
                <p className="text-xs text-faint mb-1">Sudah Ditagih</p>
                <p className="font-mono text-sm font-medium tabular-nums text-ink">{formatCurrency(totalTagih)}</p>
                {belumTagih != null && belumTagih > 0 && (
                  <p className="text-xs text-warning mt-0.5">Sisa {formatCurrency(belumTagih)} belum ditagih</p>
                )}
              </div>
              <div className="bg-white rounded-md border border-line px-3 py-2">
                <p className="text-xs text-faint mb-1">Sudah Diterima</p>
                <p className="font-mono text-sm font-medium tabular-nums text-success">{formatCurrency(totalBayar)}</p>
              </div>
              <div className="bg-white rounded-md border border-line px-3 py-2">
                <p className="text-xs text-faint mb-1">Belum Dibayar</p>
                <p className={`font-mono text-sm font-medium tabular-nums ${belumBayar > 0 ? "text-danger" : "text-success"}`}>
                  {formatCurrency(belumBayar)}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Invoice table */}
        <div className="bg-white rounded-md border border-line overflow-hidden">
          {loadingInvoices ? (
            <div className="py-10 text-center text-xs text-faint">Memuat tagihan…</div>
          ) : projectInvoices.length === 0 ? (
            <div className="py-10 text-center text-sm text-faint">
              Belum ada invoice untuk project ini.{" "}
              <button onClick={() => setShowInvoiceModal(true)} className="text-ink underline">Buat Invoice</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="bg-surface border-b border-line">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">No. Invoice</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">RAB</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Termin / Catatan</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Tgl Tagih</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Jatuh Tempo</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted">Tagihan</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted">Diterima</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {projectInvoices.map((inv) => {
                  const pays = paymentsByInvoice[inv.id] ?? [];
                  const isExpanded = expandedInvoice === inv.id;
                  const lastPay = pays.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0];
                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        className={`border-t border-line hover:bg-hover transition-colors cursor-pointer ${isExpanded ? "bg-accent-soft/40" : ""}`}
                        onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                      >
                        <td className="px-3 py-2">
                          <a
                            href={`/invoices/${inv.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-ink hover:underline"
                          >
                            {inv.invoice_number}
                          </a>
                        </td>
                        <td className="px-3 py-2">
                          {inv.rab_id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-accent-soft text-accent font-medium">
                              {approvedRabs.find((r) => r.id === inv.rab_id)?.nama ?? "RAB"}
                            </span>
                          ) : (
                            <span className="text-faint text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted text-xs max-w-[180px] truncate">
                          {inv.notes ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-muted text-xs">
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("id-ID") : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {inv.due_date ? (
                            <span className={new Date(inv.due_date) < new Date() && inv.status !== "paid" ? "text-danger font-medium" : "text-muted"}>
                              {new Date(inv.due_date).toLocaleDateString("id-ID")}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                          {formatCurrency(inv.total_amount)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div>
                            <span className={inv.paid_amount > 0 ? "text-success font-medium" : "text-faint"}>
                              {formatCurrency(inv.paid_amount)}
                            </span>
                            {lastPay && (
                              <p className="text-xs text-faint mt-0.5">
                                {new Date(lastPay.payment_date).toLocaleDateString("id-ID")}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <StatusDot tone={INVOICE_STATUS_TONE[inv.status] ?? "neutral"}>
                            {INV_STATUS_LABELS[inv.status] ?? inv.status}
                          </StatusDot>
                        </td>
                        <td className="px-3 py-2 text-faint">
                          <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${inv.id}-detail`} className="bg-accent-soft/30">
                          <td colSpan={9} className="px-6 py-3">
                            {pays.length === 0 ? (
                              <p className="text-xs text-faint py-1">Belum ada pembayaran tercatat untuk invoice ini.</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted mb-2">Riwayat Pembayaran</p>
                                {pays.map((p) => (
                                  <div key={p.id} className="flex items-center gap-4 text-xs bg-white rounded-md px-3 py-2 border border-accent/25">
                                    <span className="text-muted w-24 shrink-0">
                                      {new Date(p.payment_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                                    </span>
                                    <span className="text-faint">{METHOD_LABELS[p.payment_method] ?? p.payment_method}</span>
                                    {p.notes && <span className="text-faint truncate flex-1">{p.notes}</span>}
                                    <span className="ml-auto font-semibold text-success">{formatCurrency(p.amount)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-end text-xs font-semibold text-success pt-1 pr-2">
                                  Total: {formatCurrency(pays.reduce((s, p) => s + p.amount, 0))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface border-t border-line">
                  <td colSpan={5} className="px-4 py-2.5 text-xs font-medium text-muted">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-ink">
                    {formatCurrency(projectInvoices.reduce((s, i) => s + i.total_amount, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-medium text-success">
                    {formatCurrency(projectInvoices.reduce((s, i) => s + i.paid_amount, 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
            </div>
          )}
        </div>
      </div>

      )}

      {/* Modal Tambah Invoice */}
      {showInvoiceModal && (
        <InvoiceFormModal
          projects={projects}
          clients={clients}
          leads={leads ?? []}
          unpaidProjects={projects}
          userId={user?.id}
          preselectedProjectId={projectId}
          onSaved={async () => { await loadInvoicesData(); setShowInvoiceModal(false); }}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
}
