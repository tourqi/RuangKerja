"use client";
import { useState, useMemo } from "react";
import type { Payment, Invoice, Project, Client } from "@/types/db";
import { isDateInRange, sumAmounts, groupSumByKey } from "@/utils/reportCalculations";
import { formatIDR } from "@/utils/format";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

const methodLabels: Record<string, string> = {
  transfer: "Transfer",
  cash: "Tunai",
  check: "Cek",
};

const methodBadge: Record<string, string> = {
  transfer: "bg-blue-100 text-blue-700",
  cash: "bg-green-100 text-green-700",
  check: "bg-gray-100 text-gray-600",
};

function fmt(v: number) {
  return formatIDR(v);
}

export function LaporanPendapatan({
  payments,
  invoices,
  projects,
  clients,
}: {
  payments: Payment[];
  invoices: Invoice[];
  projects: Project[];
  clients: Client[];
}) {
  const { from: defaultFrom, to: defaultTo } = currentMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const invoiceMap = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const filtered = useMemo(
    () =>
      payments
        .filter((p) => isDateInRange(p.payment_date, dateFrom, dateTo))
        .sort((a, b) => a.payment_date.localeCompare(b.payment_date)),
    [payments, dateFrom, dateTo]
  );

  const total = sumAmounts(filtered);

  const byMethod = groupSumByKey(filtered, (p) => p.payment_method, (p) => p.amount);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Filter Tanggal:</span>
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
          <button
            onClick={() => { setDateFrom(defaultFrom); setDateTo(defaultTo); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Pendapatan</p>
          <p className="text-2xl font-bold text-green-600">{fmt(total)}</p>
          <p className="text-xs text-gray-400 mt-1">{filtered.length} transaksi</p>
        </div>
        {(["transfer", "cash", "check"] as const).map((method) => (
          <div key={method} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {methodLabels[method]}
            </p>
            <p className="text-xl font-bold text-gray-900">{fmt(byMethod[method] ?? 0)}</p>
            <div className="mt-2 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-green-400 h-1.5 rounded-full"
                style={{
                  width: total > 0 ? `${Math.round(((byMethod[method] ?? 0) / total) * 100)}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Detail Pembayaran Masuk</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(dateFrom).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            {" "}&ndash;{" "}
            {new Date(dateTo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            Tidak ada data pendapatan pada periode yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 w-10">No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Tanggal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Klien</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Project</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">No. Invoice</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Metode</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden md:table-cell">Catatan</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((payment, idx) => {
                  const invoice = invoiceMap.get(payment.invoice_id);
                  const project = invoice?.project_id ? projectMap.get(invoice.project_id) : undefined;
                  const client = invoice?.client_id
                    ? clientMap.get(invoice.client_id)
                    : project?.client_id
                    ? clientMap.get(project.client_id)
                    : undefined;
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-xs text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-700 whitespace-nowrap">
                        {new Date(payment.payment_date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-700">{client?.name ?? "—"}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-700">{project?.name ?? "—"}</td>
                      <td className="py-2.5 px-4 text-xs font-mono text-gray-600">
                        {invoice?.invoice_number ?? "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            methodBadge[payment.payment_method] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {methodLabels[payment.payment_method] ?? payment.payment_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-gray-400 hidden md:table-cell max-w-[160px] truncate">
                        {payment.notes || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-semibold text-green-600 whitespace-nowrap">
                        {fmt(payment.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-3 px-4 text-xs font-bold text-gray-900" colSpan={7}>
                    Total Pendapatan
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-bold text-green-600 whitespace-nowrap">
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
