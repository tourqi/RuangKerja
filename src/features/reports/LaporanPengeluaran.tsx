"use client";
import { useState, useMemo } from "react";
import type { ProjectExpense, Project, Client } from "@/types/db";
import { isDateInRange, sumAmounts, groupSumByKey } from "@/utils/reportCalculations";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

const categoryLabels: Record<string, string> = {
  material: "Material",
  jasa: "Jasa",
  transport: "Transport",
  lainnya: "Lainnya",
};

const categoryBadge: Record<string, string> = {
  material: "bg-blue-100 text-blue-700",
  jasa: "bg-purple-100 text-purple-700",
  transport: "bg-yellow-100 text-yellow-700",
  lainnya: "bg-gray-100 text-gray-600",
};

const categoryBar: Record<string, string> = {
  material: "bg-blue-400",
  jasa: "bg-purple-400",
  transport: "bg-yellow-400",
  lainnya: "bg-gray-400",
};

function fmt(v: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v);
}

const ALL_CATEGORIES = ["material", "jasa", "transport", "lainnya"] as const;

export function LaporanPengeluaran({
  expenses,
  projects,
  clients,
}: {
  expenses: ProjectExpense[];
  projects: Project[];
  clients: Client[];
}) {
  const { from: defaultFrom, to: defaultTo } = currentMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filtered = useMemo(
    () =>
      expenses
        .filter((e) => {
          if (!isDateInRange(e.tanggal, dateFrom, dateTo)) return false;
          if (categoryFilter.length > 0 && !categoryFilter.includes(e.kategori)) return false;
          return true;
        })
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
    [expenses, dateFrom, dateTo, categoryFilter]
  );

  const total = sumAmounts(filtered.map((e) => ({ amount: e.jumlah })));

  const byCategory = groupSumByKey(filtered, (e) => e.kategori, (e) => e.jumlah);

  const toggleCategory = (cat: string) =>
    setCategoryFilter((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const reset = () => {
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setCategoryFilter([]);
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Filter:</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400">Kategori:</span>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  categoryFilter.includes(cat)
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 underline">
            Reset
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Pengeluaran</p>
          <p className="text-2xl font-bold text-red-600">{fmt(total)}</p>
          <p className="text-xs text-gray-400 mt-1">{filtered.length} transaksi</p>
        </div>
        {ALL_CATEGORIES.map((cat) => (
          <div key={cat} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {categoryLabels[cat]}
            </p>
            <p className="text-xl font-bold text-gray-900">{fmt(byCategory[cat] ?? 0)}</p>
            <div className="mt-2 bg-gray-100 rounded-full h-1.5">
              <div
                className={`${categoryBar[cat]} h-1.5 rounded-full`}
                style={{
                  width: total > 0 ? `${Math.round(((byCategory[cat] ?? 0) / total) * 100)}%` : "0%",
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {total > 0 ? Math.round(((byCategory[cat] ?? 0) / total) * 100) : 0}% dari total
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Detail Pengeluaran</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(dateFrom).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            {" "}&ndash;{" "}
            {new Date(dateTo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            {categoryFilter.length > 0 &&
              ` · ${categoryFilter.map((c) => categoryLabels[c]).join(", ")}`}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Tidak ada data pengeluaran pada periode yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 w-10">No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Tanggal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Project</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden sm:table-cell">Klien</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Kategori</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Deskripsi</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden md:table-cell">Vendor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden lg:table-cell">Catatan</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((expense, idx) => {
                  const project = projectMap.get(expense.project_id);
                  const client = project?.client_id ? clientMap.get(project.client_id) : undefined;
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-xs text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-700 whitespace-nowrap">
                        {new Date(expense.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-gray-900">
                        {project?.name ?? "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-600 hidden sm:table-cell">
                        {client?.name ?? "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            categoryBadge[expense.kategori] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {categoryLabels[expense.kategori] ?? expense.kategori}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-700 max-w-[180px] truncate">
                        {expense.deskripsi}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-500 hidden md:table-cell">
                        {expense.vendor || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-400 hidden lg:table-cell max-w-[160px] truncate">
                        {expense.notes || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-semibold text-red-600 whitespace-nowrap">
                        {fmt(expense.jumlah)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-3 px-4 text-xs font-bold text-gray-900" colSpan={8}>
                    Total Pengeluaran
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-red-600 whitespace-nowrap">
                    {fmt(total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
