"use client";
import { useState, useMemo } from "react";
import type { Payment, ProjectExpense, Invoice, Project, Client } from "@/types/db";
import { isDateInRange, sumAmounts, sortCashFlowEntries, withRunningBalance } from "@/utils/reportCalculations";
import { formatIDR, formatDate } from "@/utils/format";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function fmt(v: number) {
  return formatIDR(v);
}

type CashFlowRow =
  | { type: "masuk"; isInflow: true; date: string; id: string; desc: string; ref: string; method: string; amount: number }
  | { type: "keluar"; isInflow: false; date: string; id: string; desc: string; ref: string; kategori: string; amount: number };

const methodLabels: Record<string, string> = {
  transfer: "Transfer",
  cash: "Tunai",
  check: "Cek",
};

const kategoriLabels: Record<string, string> = {
  material: "Material",
  jasa: "Jasa",
  transport: "Transport",
  lainnya: "Lainnya",
};

export function LaporanArusKas({
  payments,
  expenses,
  invoices,
  projects,
  clients,
}: {
  payments: Payment[];
  expenses: ProjectExpense[];
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

  const rows = useMemo<CashFlowRow[]>(() => {
    const masuk: CashFlowRow[] = payments
      .filter((p) => isDateInRange(p.payment_date, dateFrom, dateTo))
      .map((p) => {
        const invoice = invoiceMap.get(p.invoice_id);
        const project = invoice?.project_id ? projectMap.get(invoice.project_id) : undefined;
        const client = invoice?.client_id
          ? clientMap.get(invoice.client_id)
          : project?.client_id
          ? clientMap.get(project.client_id)
          : undefined;
        const desc = client?.name ?? project?.name ?? invoice?.invoice_number ?? "—";
        return {
          type: "masuk",
          isInflow: true,
          date: p.payment_date.slice(0, 10),
          id: p.id,
          desc,
          ref: invoice?.invoice_number ?? "—",
          method: p.payment_method,
          amount: p.amount,
        } as const;
      });

    const keluar: CashFlowRow[] = expenses
      .filter((e) => isDateInRange(e.tanggal, dateFrom, dateTo))
      .map((e) => {
        const project = projectMap.get(e.project_id);
        return {
          type: "keluar",
          isInflow: false,
          date: e.tanggal.slice(0, 10),
          id: e.id,
          desc: e.deskripsi,
          ref: project?.name ?? "—",
          kategori: e.kategori,
          amount: e.jumlah,
        } as const;
      });

    return sortCashFlowEntries([...masuk, ...keluar]);
  }, [payments, expenses, dateFrom, dateTo, invoiceMap, projectMap, clientMap]);

  const totalMasuk = sumAmounts(rows.filter((r) => r.type === "masuk"));
  const totalKeluar = sumAmounts(rows.filter((r) => r.type === "keluar"));
  const arusBersih = totalMasuk - totalKeluar;
  const rowsWithBalance = useMemo(() => withRunningBalance(rows), [rows]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="bg-white rounded-md border border-line p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-muted">Periode:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="laporan-arus-kas-dari" className="text-xs text-muted">Dari</label>
            <input id="laporan-arus-kas-dari"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="laporan-arus-kas-sampai" className="text-xs text-muted">Sampai</label>
            <input id="laporan-arus-kas-sampai"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <button
            onClick={() => { setDateFrom(defaultFrom); setDateTo(defaultTo); }}
            className="text-xs text-faint hover:text-muted underline"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-md border border-line p-5">
          <p className="text-xs font-semibold text-faint mb-1">Total Pemasukan</p>
          <p className="text-2xl font-semibold text-success">{fmt(totalMasuk)}</p>
          <p className="text-xs text-faint mt-1">
            {rows.filter((r) => r.type === "masuk").length} transaksi
          </p>
        </div>
        <div className="bg-white rounded-md border border-line p-5">
          <p className="text-xs font-semibold text-faint mb-1">Total Pengeluaran</p>
          <p className="text-2xl font-semibold text-danger">{fmt(totalKeluar)}</p>
          <p className="text-xs text-faint mt-1">
            {rows.filter((r) => r.type === "keluar").length} transaksi
          </p>
        </div>
        <div className={`bg-white rounded-md border p-5 ${arusBersih >= 0 ? "border-success/25" : "border-danger-line"}`}>
          <p className="text-xs font-semibold text-faint mb-1">Arus Kas Bersih</p>
          <p className={`text-2xl font-semibold ${arusBersih >= 0 ? "text-success" : "text-danger"}`}>
            {fmt(arusBersih)}
          </p>
          <p className="text-xs text-faint mt-1">
            {arusBersih >= 0 ? "Surplus" : "Defisit"} pada periode ini
          </p>
        </div>
      </div>

      {/* Bar pemasukan vs pengeluaran */}
      {(totalMasuk > 0 || totalKeluar > 0) && (
        <div className="bg-white rounded-md border border-line p-5">
          <p className="text-xs font-semibold text-muted mb-3">Perbandingan Pemasukan vs Pengeluaran</p>
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-success font-medium">Pemasukan</span>
                <span className="text-muted">{fmt(totalMasuk)}</span>
              </div>
              <div className="h-3 bg-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full"
                  style={{
                    width: `${totalMasuk + totalKeluar > 0 ? Math.round((totalMasuk / (totalMasuk + totalKeluar)) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-danger font-medium">Pengeluaran</span>
                <span className="text-muted">{fmt(totalKeluar)}</span>
              </div>
              <div className="h-3 bg-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-danger rounded-full"
                  style={{
                    width: `${totalMasuk + totalKeluar > 0 ? Math.round((totalKeluar / (totalMasuk + totalKeluar)) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-md border border-line overflow-hidden">
        <div className="p-4 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">Detail Arus Kas</h3>
          <p className="text-xs text-faint mt-0.5">
            {new Date(dateFrom).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            {" "}&ndash;{" "}
            {new Date(dateTo).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-faint">
            Tidak ada transaksi pada periode yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted w-10">No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted">Tanggal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted">Jenis</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted">Keterangan</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted hidden sm:table-cell">Ref / Project</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted hidden md:table-cell">Kategori / Metode</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-success">Masuk</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-danger">Keluar</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted hidden lg:table-cell">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(() => {
                  return rowsWithBalance.map((row, idx) => {
                    const saldo = row.balance;
                    return (
                      <tr
                        key={row.id}
                        className={`hover:bg-hover ${row.type === "masuk" ? "bg-success-soft/20" : "bg-danger-soft/20"}`}
                      >
                        <td className="py-2.5 px-4 text-xs text-faint">{idx + 1}</td>
                        <td className="py-2.5 px-4 text-xs text-ink whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              row.type === "masuk"
                                ? "tone-success"
                                : "tone-danger"
                            }`}
                          >
                            {row.type === "masuk" ? "Pemasukan" : "Pengeluaran"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-ink max-w-[180px] truncate">
                          {row.desc}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted hidden sm:table-cell">
                          {row.ref}
                        </td>
                        <td className="py-2.5 px-4 hidden md:table-cell">
                          {row.type === "masuk" ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                              {methodLabels[row.method] ?? row.method}
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                              {kategoriLabels[row.kategori] ?? row.kategori}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                          {row.type === "masuk" ? (
                            <span className="text-success">{fmt(row.amount)}</span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                          {row.type === "keluar" ? (
                            <span className="text-danger">{fmt(row.amount)}</span>
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap hidden lg:table-cell">
                          <span className={saldo >= 0 ? "text-ink" : "text-danger"}>
                            {fmt(saldo)}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-surface">
                  <td className="py-3 px-4 text-xs font-semibold text-ink" colSpan={6}>
                    Total
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-success whitespace-nowrap">
                    {fmt(totalMasuk)}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-danger whitespace-nowrap">
                    {fmt(totalKeluar)}
                  </td>
                  <td className={`py-3 px-4 text-right text-xs font-semibold whitespace-nowrap hidden lg:table-cell ${arusBersih >= 0 ? "text-success" : "text-danger"}`}>
                    {fmt(arusBersih)}
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
