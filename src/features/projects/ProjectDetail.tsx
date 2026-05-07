"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/services/expenses";
import { useToast } from "@/components/Toast";
import ActivityTimeline from "@/components/ActivityTimeline";
import type { ExpenseCategory, ProjectExpense } from "@/types/db";
import { projectStatusLabel } from "@/types/db";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: "Material",
  jasa: "Jasa",
  transport: "Transport",
  lainnya: "Lainnya",
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: "bg-blue-100 text-blue-700",
  jasa: "bg-purple-100 text-purple-700",
  transport: "bg-orange-100 text-orange-700",
  lainnya: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<string, string> = {
  Planning: "bg-gray-100 text-gray-700",
  Design: "bg-blue-100 text-blue-800",
  Production: "bg-yellow-100 text-yellow-800",
  Installation: "bg-purple-100 text-purple-800",
  Done: "bg-green-100 text-green-800",
};

type LocalExpense = ProjectExpense & { _saving?: boolean; _jumlahFocused?: boolean };

const TODAY = new Date().toISOString().slice(0, 10);
const PAGE_SIZE = 20;

const formatNumber = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { projects, loading: lp } = useProjects();
  const { clients, loading: lc } = useClients();

  const [expenses, setExpenses] = useState<LocalExpense[]>([]);
  const [loadingExp, setLoadingExp] = useState(true);
  const [addingRow, setAddingRow] = useState(false);

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

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [filterKategori, filterVendor]);

  if (lp || lc) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6">
          <span>←</span> Kembali
        </button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Project tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const client = clients.find((c) => c.id === project.client_id);
  const progress = project.progress ?? 0;
  const projectValue = project.value ?? 0;
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <span>←</span> Kembali ke Projects
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{project.name}</h1>
            {client && <p className="text-sm text-gray-500 mt-0.5">{client.name}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[project.status] ?? "bg-gray-100 text-gray-700"}`}>
                {projectStatusLabel[project.status]}
              </span>
              {project.assigned_to && (
                <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full">{project.assigned_to}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 w-full sm:w-40">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progress</span>
              <span className="font-semibold text-gray-900">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">Nilai Project</p>
            <p className="text-base font-bold text-gray-900 truncate">{projectValue ? formatCurrency(projectValue) : "-"}</p>
          </div>
          <div className="bg-red-50 rounded-lg px-4 py-3">
            <p className="text-xs text-red-400 mb-1">Total Pengeluaran</p>
            <p className="text-base font-bold text-red-500 truncate">{formatCurrency(totalPengeluaran)}</p>
          </div>
          <div className={`rounded-lg px-4 py-3 ${estimasiProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <p className={`text-xs mb-1 ${estimasiProfit >= 0 ? "text-green-500" : "text-red-400"}`}>
              Estimasi Profit{marginPct ? ` (${marginPct}%)` : ""}
            </p>
            <p className={`text-base font-bold truncate ${estimasiProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
              {formatCurrency(estimasiProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Informasi Project */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Informasi Project</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
            <p className="text-sm text-gray-800">{client?.name ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
            <p className="text-sm text-gray-800">{projectStatusLabel[project.status]}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Assigned To</p>
            <p className="text-sm text-gray-800">{project.assigned_to ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Start Date</p>
            <p className="text-sm text-gray-800">{formatDate(project.start_date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Deadline</p>
            <p className="text-sm text-gray-800">{formatDate(project.deadline)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Nilai Project</p>
            <p className="text-sm font-semibold text-gray-800">{projectValue ? formatCurrency(projectValue) : "-"}</p>
          </div>
        </div>
      </div>

      {/* Pengeluaran */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">
          Pengeluaran
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{expenses.length}</span>
        </h2>

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
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
          >
            <option value="">Semua Kategori</option>
            {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
              <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
            ))}
          </select>

          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
          >
            <option value="">Semua Vendor</option>
            {vendorOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {hasFilter && (
            <button
              onClick={() => { setFilterKategori(""); setFilterVendor(""); }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-700 transition"
            >
              Reset filter
            </button>
          )}

          {hasFilter && (
            <span className="text-xs text-gray-400 ml-1">
              {filteredExpenses.length} dari {expenses.length} baris
            </span>
          )}
        </div>

        {/* Inline table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Add row button */}
          <div className="px-3 py-2 border-b border-gray-100">
            <button
              onClick={handleAddRow}
              disabled={addingRow}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-800 transition disabled:opacity-50"
            >
              <span className="text-base leading-none">+</span>
              {addingRow ? "Menambahkan..." : "Tambah Baris"}
            </button>
          </div>
          {loadingExp ? (
            <div className="py-10 text-center text-xs text-gray-400">Memuat...</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28">Tanggal</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deskripsi</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 hidden sm:table-cell">Kategori</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-32 hidden md:table-cell">Vendor</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-36">Jumlah (IDR)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">
                      {hasFilter ? "Tidak ada data sesuai filter." : "Belum ada pengeluaran. Klik \"+ Tambah Baris\" di atas."}
                    </td>
                  </tr>
                )}
                {pagedExpenses.map((exp) => (
                  <tr key={exp.id} className="group hover:bg-gray-50 transition-colors">
                    {/* Tanggal */}
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={exp.tanggal}
                        onChange={(e) => updateLocal(exp.id, "tanggal", e.target.value)}
                        onBlur={() => handleBlur(exp, "tanggal")}
                        className="w-full px-2 py-1 text-xs text-gray-700 bg-transparent border border-transparent rounded focus:outline-none focus:border-gray-300 focus:bg-white transition"
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
                        className="w-full px-2 py-1 text-sm text-gray-800 bg-transparent border border-transparent rounded focus:outline-none focus:border-gray-300 focus:bg-white transition placeholder-gray-300"
                      />
                    </td>
                    {/* Kategori */}
                    <td className="px-2 py-1.5 hidden sm:table-cell">
                      <select
                        value={exp.kategori}
                        onChange={(e) => {
                          updateLocal(exp.id, "kategori", e.target.value);
                          updateExpense(exp.id, { kategori: e.target.value as ExpenseCategory }).catch(() => {
                            toast("Gagal menyimpan kategori", "error");
                          });
                        }}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-300 ${CATEGORY_COLORS[exp.kategori]}`}
                      >
                        {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
                          <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                        ))}
                      </select>
                    </td>
                    {/* Vendor */}
                    <td className="px-2 py-1.5 hidden md:table-cell">
                      <input
                        type="text"
                        value={exp.vendor ?? ""}
                        placeholder="—"
                        onChange={(e) => updateLocal(exp.id, "vendor", e.target.value)}
                        onBlur={() => handleBlur(exp, "vendor")}
                        className="w-full px-2 py-1 text-xs text-gray-600 bg-transparent border border-transparent rounded focus:outline-none focus:border-gray-300 focus:bg-white transition placeholder-gray-300"
                      />
                    </td>
                    {/* Jumlah */}
                    <td className="px-2 py-1.5">
                      <input
                        type={exp._jumlahFocused ? "number" : "text"}
                        value={exp._jumlahFocused ? (exp.jumlah || "") : (exp.jumlah ? formatNumber(exp.jumlah) : "")}
                        placeholder="0"
                        min="0"
                        onChange={(e) => updateLocal(exp.id, "jumlah", Number(e.target.value))}
                        onFocus={() => setExpenses((prev) => prev.map((r) => r.id === exp.id ? { ...r, _jumlahFocused: true } : r))}
                        onBlur={() => {
                          setExpenses((prev) => prev.map((r) => r.id === exp.id ? { ...r, _jumlahFocused: false } : r));
                          handleBlur(exp, "jumlah");
                        }}
                        className="w-full px-2 py-1 text-sm text-right font-medium text-red-500 bg-transparent border border-transparent rounded focus:outline-none focus:border-gray-300 focus:bg-white transition placeholder-gray-300"
                      />
                    </td>
                    {/* Delete */}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition mx-auto"
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
                  <tr className="bg-gray-50 border-t border-gray-100">
                    <td colSpan={4} className="px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {hasFilter ? "Total (difilter)" : "Total Pengeluaran"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                      {formatCurrency(totalFiltered)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Halaman {page} dari {totalPages} · {filteredExpenses.length} data
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                    <span key={`ellipsis-${i}`} className="px-2 py-1.5">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`px-3 py-1.5 rounded-lg border transition ${
                        page === p
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <ActivityTimeline entityType="project" entityId={projectId} />
    </div>
  );
}
