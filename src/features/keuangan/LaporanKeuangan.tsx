"use client";
import { useState, useMemo } from "react";
import type { Payment, ProjectExpense, GeneralExpense, Invoice, Project, Client } from "@/types/db";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const methodLabels: Record<string, string> = {
  transfer: "Transfer",
  cash: "Tunai",
  check: "Cek",
};

const generalKategoriLabel: Record<string, string> = {
  operasional: "Operasional",
  marketing: "Marketing",
  gaji: "Gaji & SDM",
  lainnya: "Lainnya",
};

const generalKategoriBadge: Record<string, string> = {
  operasional: "bg-blue-100 text-blue-700",
  marketing: "bg-purple-100 text-purple-700",
  gaji: "bg-amber-100 text-amber-700",
  lainnya: "bg-gray-100 text-gray-600",
};

const projectKategoriLabel: Record<string, string> = {
  material: "Material",
  jasa: "Jasa",
  transport: "Transport",
  lainnya: "Lainnya",
};

type Row =
  | { type: "masuk"; date: string; id: string; desc: string; ref: string; meta: string; amount: number }
  | { type: "keluar-project"; date: string; id: string; desc: string; ref: string; meta: string; amount: number }
  | { type: "keluar-umum"; date: string; id: string; desc: string; ref: string; meta: string; amount: number };

type Tab = "arus-kas" | "pemasukan" | "pengeluaran";

interface Props {
  payments: Payment[];
  projectExpenses: ProjectExpense[];
  generalExpenses: GeneralExpense[];
  invoices: Invoice[];
  projects: Project[];
  clients: Client[];
}

export function LaporanKeuangan({
  payments,
  projectExpenses,
  generalExpenses,
  invoices,
  projects,
  clients,
}: Props) {
  const { from: defaultFrom, to: defaultTo } = currentMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [tab, setTab] = useState<Tab>("arus-kas");

  const invoiceMap = useMemo(() => new Map(invoices.map((i) => [i.id, i])), [invoices]);
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const inRange = (d: string) => {
    const date = d.slice(0, 10);
    return date >= dateFrom && date <= dateTo;
  };

  const rows = useMemo<Row[]>(() => {
    const masuk: Row[] = payments
      .filter((p) => inRange(p.payment_date))
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
          date: p.payment_date.slice(0, 10),
          id: p.id,
          desc,
          ref: invoice?.invoice_number ?? "—",
          meta: methodLabels[p.payment_method] ?? p.payment_method,
          amount: p.amount,
        };
      });

    const keluarProject: Row[] = projectExpenses
      .filter((e) => inRange(e.tanggal))
      .map((e) => ({
        type: "keluar-project",
        date: e.tanggal.slice(0, 10),
        id: e.id,
        desc: e.deskripsi,
        ref: projectMap.get(e.project_id)?.name ?? "—",
        meta: projectKategoriLabel[e.kategori] ?? e.kategori,
        amount: e.jumlah,
      }));

    const keluarUmum: Row[] = generalExpenses
      .filter((e) => inRange(e.tanggal))
      .map((e) => ({
        type: "keluar-umum",
        date: e.tanggal.slice(0, 10),
        id: e.id,
        desc: e.deskripsi,
        ref: e.vendor ?? "—",
        meta: generalKategoriLabel[e.kategori] ?? e.kategori,
        amount: e.jumlah,
      }));

    return [...masuk, ...keluarProject, ...keluarUmum].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      if (a.type === "masuk" && b.type !== "masuk") return -1;
      if (a.type !== "masuk" && b.type === "masuk") return 1;
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, projectExpenses, generalExpenses, dateFrom, dateTo, invoiceMap, projectMap, clientMap]);

  const totalMasuk = rows.filter((r) => r.type === "masuk").reduce((s, r) => s + r.amount, 0);
  const totalKeluarProject = rows.filter((r) => r.type === "keluar-project").reduce((s, r) => s + r.amount, 0);
  const totalKeluarUmum = rows.filter((r) => r.type === "keluar-umum").reduce((s, r) => s + r.amount, 0);
  const totalKeluar = totalKeluarProject + totalKeluarUmum;
  const arusBersih = totalMasuk - totalKeluar;

  const visibleRows = useMemo(() => {
    if (tab === "pemasukan") return rows.filter((r) => r.type === "masuk");
    if (tab === "pengeluaran") return rows.filter((r) => r.type !== "masuk");
    return rows;
  }, [rows, tab]);

  const filterSection = (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-gray-500">Periode:</span>
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
          Bulan ini
        </button>
      </div>
    </div>
  );

  const summaryCards = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pemasukan</p>
        <p className="text-xl font-bold text-green-600">{fmt(totalMasuk)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{rows.filter((r) => r.type === "masuk").length} transaksi</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Biaya Project</p>
        <p className="text-xl font-bold text-orange-600">{fmt(totalKeluarProject)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{rows.filter((r) => r.type === "keluar-project").length} transaksi</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Biaya Umum</p>
        <p className="text-xl font-bold text-red-600">{fmt(totalKeluarUmum)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{rows.filter((r) => r.type === "keluar-umum").length} transaksi</p>
      </div>
      <div className={`bg-white rounded-xl border shadow-sm p-4 ${arusBersih >= 0 ? "border-green-200" : "border-red-200"}`}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Arus Kas Bersih</p>
        <p className={`text-xl font-bold ${arusBersih >= 0 ? "text-green-700" : "text-red-600"}`}>{fmt(arusBersih)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{arusBersih >= 0 ? "Surplus" : "Defisit"}</p>
      </div>
    </div>
  );

  const barChart = (totalMasuk > 0 || totalKeluar > 0) && (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-500 mb-3">Perbandingan Pemasukan vs Pengeluaran</p>
      <div className="space-y-2.5">
        {[
          { label: "Pemasukan", value: totalMasuk, color: "bg-green-400", textColor: "text-green-700" },
          { label: "Biaya Project", value: totalKeluarProject, color: "bg-orange-400", textColor: "text-orange-600" },
          { label: "Biaya Umum", value: totalKeluarUmum, color: "bg-red-400", textColor: "text-red-600" },
        ].map(({ label, value, color, textColor }) => {
          const max = Math.max(totalMasuk, totalKeluar);
          const pct = max > 0 ? Math.round((value / max) * 100) : 0;
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${textColor}`}>{label}</span>
                <span className="text-gray-600">{fmt(value)}</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const tabs = (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {(
        [
          { id: "arus-kas", label: "Arus Kas" },
          { id: "pemasukan", label: "Pemasukan" },
          { id: "pengeluaran", label: "Pengeluaran" },
        ] as { id: Tab; label: string }[]
      ).map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const table = (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            {tab === "arus-kas" ? "Detail Arus Kas" : tab === "pemasukan" ? "Detail Pemasukan" : "Detail Pengeluaran"}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {fmtDate(dateFrom)} &ndash; {fmtDate(dateTo)}
          </p>
        </div>
        <span className="text-xs text-gray-400">{visibleRows.length} transaksi</span>
      </div>

      {visibleRows.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-400">
          Tidak ada transaksi pada periode yang dipilih.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 w-10">No</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Tanggal</th>
                {tab === "arus-kas" && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Jenis</th>
                )}
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Keterangan</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden sm:table-cell">Ref</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden md:table-cell">Kategori / Metode</th>
                {tab === "arus-kas" ? (
                  <>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-green-600">Masuk</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-red-500">Keluar</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 hidden lg:table-cell">Saldo</th>
                  </>
                ) : (
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Jumlah</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(() => {
                let running = 0;
                return visibleRows.map((row, idx) => {
                  if (row.type === "masuk") running += row.amount;
                  else running -= row.amount;
                  const saldo = running;
                  const isMasuk = row.type === "masuk";
                  const isUmum = row.type === "keluar-umum";

                  return (
                    <tr
                      key={row.id + row.type}
                      className={`hover:bg-gray-50 ${isMasuk ? "bg-green-50/20" : "bg-red-50/10"}`}
                    >
                      <td className="py-2.5 px-4 text-xs text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-700 whitespace-nowrap">{fmtDate(row.date)}</td>
                      {tab === "arus-kas" && (
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isMasuk
                                ? "bg-green-100 text-green-700"
                                : isUmum
                                ? "bg-red-100 text-red-600"
                                : "bg-orange-100 text-orange-600"
                            }`}
                          >
                            {isMasuk ? "Pemasukan" : isUmum ? "Biaya Umum" : "Biaya Project"}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-xs text-gray-800 max-w-[180px] truncate">{row.desc}</td>
                      <td className="py-2.5 px-4 text-xs text-gray-500 hidden sm:table-cell truncate max-w-[120px]">{row.ref}</td>
                      <td className="py-2.5 px-4 hidden md:table-cell">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isMasuk
                              ? "bg-blue-50 text-blue-600"
                              : isUmum
                              ? generalKategoriBadge[row.meta.toLowerCase()] ?? "bg-gray-100 text-gray-600"
                              : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          {row.meta}
                        </span>
                      </td>
                      {tab === "arus-kas" ? (
                        <>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                            {isMasuk ? <span className="text-green-600">{fmt(row.amount)}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                            {!isMasuk ? <span className="text-red-500">{fmt(row.amount)}</span> : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap hidden lg:table-cell">
                            <span className={saldo >= 0 ? "text-gray-700" : "text-red-600"}>{fmt(saldo)}</span>
                          </td>
                        </>
                      ) : (
                        <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                          <span className={isMasuk ? "text-green-600" : "text-red-500"}>{fmt(row.amount)}</span>
                        </td>
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={tab === "arus-kas" ? 5 : 4} className="py-3 px-4 text-xs font-bold text-gray-900">
                  Total
                </td>
                {tab === "arus-kas" ? (
                  <>
                    <td className="py-3 px-4 text-right text-xs font-bold text-green-600 whitespace-nowrap hidden md:table-cell" />
                    <td className="py-3 px-4 text-right text-xs font-bold text-green-600 whitespace-nowrap">{fmt(totalMasuk)}</td>
                    <td className="py-3 px-4 text-right text-xs font-bold text-red-500 whitespace-nowrap">{fmt(totalKeluar)}</td>
                    <td className={`py-3 px-4 text-right text-xs font-bold whitespace-nowrap hidden lg:table-cell ${arusBersih >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {fmt(arusBersih)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="hidden sm:table-cell" />
                    <td className="hidden md:table-cell" />
                    <td className="py-3 px-4 text-right text-xs font-bold whitespace-nowrap">
                      <span className={tab === "pemasukan" ? "text-green-600" : "text-red-500"}>
                        {fmt(visibleRows.reduce((s, r) => s + r.amount, 0))}
                      </span>
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {filterSection}
      {summaryCards}
      {barChart}
      {tabs}
      {table}
    </div>
  );
}
