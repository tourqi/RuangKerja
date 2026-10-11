"use client";
import { useState, useMemo } from "react";
import { DetailTabs } from "@/components/DetailTabs";
import type { Payment, ProjectExpense, GeneralExpense, Invoice, Project, Client } from "@/types/db";
import { isDateInRange, sumAmounts, sortCashFlowEntries, withRunningBalance } from "@/utils/reportCalculations";
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

const fmt = (v: number) =>
  formatIDR(v);

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
  operasional: "tone-active",
  marketing: "tone-active",
  gaji: "tone-warning",
  lainnya: "tone-neutral",
};

const projectKategoriLabel: Record<string, string> = {
  material: "Material",
  jasa: "Jasa",
  transport: "Transport",
  lainnya: "Lainnya",
};

type Row =
  | { type: "masuk"; isInflow: true; date: string; id: string; desc: string; ref: string; meta: string; amount: number }
  | { type: "keluar-project"; isInflow: false; date: string; id: string; desc: string; ref: string; meta: string; amount: number }
  | { type: "keluar-umum"; isInflow: false; date: string; id: string; desc: string; ref: string; meta: string; amount: number };

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

  const inRange = (d: string) => isDateInRange(d, dateFrom, dateTo);

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
          isInflow: true,
          date: p.payment_date.slice(0, 10),
          id: p.id,
          desc,
          ref: invoice?.invoice_number ?? "—",
          meta: methodLabels[p.payment_method] ?? p.payment_method,
          amount: p.amount,
        } as const;
      });

    const keluarProject: Row[] = projectExpenses
      .filter((e) => inRange(e.tanggal))
      .map((e) => ({
        type: "keluar-project",
        isInflow: false,
        date: e.tanggal.slice(0, 10),
        id: e.id,
        desc: e.deskripsi,
        ref: projectMap.get(e.project_id)?.name ?? "—",
        meta: projectKategoriLabel[e.kategori] ?? e.kategori,
        amount: e.jumlah,
      } as const));

    const keluarUmum: Row[] = generalExpenses
      .filter((e) => inRange(e.tanggal))
      .map((e) => ({
        type: "keluar-umum",
        isInflow: false,
        date: e.tanggal.slice(0, 10),
        id: e.id,
        desc: e.deskripsi,
        ref: e.vendor ?? "—",
        meta: generalKategoriLabel[e.kategori] ?? e.kategori,
        amount: e.jumlah,
      } as const));

    return sortCashFlowEntries([...masuk, ...keluarProject, ...keluarUmum]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, projectExpenses, generalExpenses, dateFrom, dateTo, invoiceMap, projectMap, clientMap]);

  const totalMasuk = sumAmounts(rows.filter((r) => r.type === "masuk"));
  const totalKeluarProject = sumAmounts(rows.filter((r) => r.type === "keluar-project"));
  const totalKeluarUmum = sumAmounts(rows.filter((r) => r.type === "keluar-umum"));
  const totalKeluar = totalKeluarProject + totalKeluarUmum;
  const arusBersih = totalMasuk - totalKeluar;

  const visibleRows = useMemo(() => {
    if (tab === "pemasukan") return rows.filter((r) => r.type === "masuk");
    if (tab === "pengeluaran") return rows.filter((r) => r.type !== "masuk");
    return rows;
  }, [rows, tab]);
  const visibleRowsWithBalance = useMemo(() => withRunningBalance(visibleRows), [visibleRows]);

  const filterSection = (
    <div className="bg-white rounded-md border border-line p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-muted">Periode:</span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Dari</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted">Sampai</label>
          <input
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
          Bulan ini
        </button>
      </div>
    </div>
  );

  const summaryCards = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white rounded-md border border-line p-4">
        <p className="text-xs font-semibold text-faint mb-1">Pemasukan</p>
        <p className="text-xl font-semibold text-success">{fmt(totalMasuk)}</p>
        <p className="text-xs text-faint mt-0.5">{rows.filter((r) => r.type === "masuk").length} transaksi</p>
      </div>
      <div className="bg-white rounded-md border border-line p-4">
        <p className="text-xs font-semibold text-faint mb-1">Biaya Project</p>
        <p className="text-xl font-semibold text-warning">{fmt(totalKeluarProject)}</p>
        <p className="text-xs text-faint mt-0.5">{rows.filter((r) => r.type === "keluar-project").length} transaksi</p>
      </div>
      <div className="bg-white rounded-md border border-line p-4">
        <p className="text-xs font-semibold text-faint mb-1">Biaya Umum</p>
        <p className="text-xl font-semibold text-danger">{fmt(totalKeluarUmum)}</p>
        <p className="text-xs text-faint mt-0.5">{rows.filter((r) => r.type === "keluar-umum").length} transaksi</p>
      </div>
      <div className={`bg-white rounded-md border p-4 ${arusBersih >= 0 ? "border-success/25" : "border-danger-line"}`}>
        <p className="text-xs font-semibold text-faint mb-1">Arus Kas Bersih</p>
        <p className={`text-xl font-semibold ${arusBersih >= 0 ? "text-success" : "text-danger"}`}>{fmt(arusBersih)}</p>
        <p className="text-xs text-faint mt-0.5">{arusBersih >= 0 ? "Surplus" : "Defisit"}</p>
      </div>
    </div>
  );

  const barChart = (totalMasuk > 0 || totalKeluar > 0) && (
    <div className="bg-white rounded-md border border-line p-5">
      <p className="text-xs font-semibold text-muted mb-3">Perbandingan Pemasukan vs Pengeluaran</p>
      <div className="space-y-2.5">
        {[
          { label: "Pemasukan", value: totalMasuk, color: "bg-success", textColor: "text-success" },
          { label: "Biaya Project", value: totalKeluarProject, color: "bg-warning", textColor: "text-warning" },
          { label: "Biaya Umum", value: totalKeluarUmum, color: "bg-danger", textColor: "text-danger" },
        ].map(({ label, value, color, textColor }) => {
          const max = Math.max(totalMasuk, totalKeluar);
          const pct = max > 0 ? Math.round((value / max) * 100) : 0;
          return (
            <div key={label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`font-medium ${textColor}`}>{label}</span>
                <span className="text-muted">{fmt(value)}</span>
              </div>
              <div className="h-2.5 bg-hover rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const tabs = (
    <DetailTabs<Tab>
      tabs={[
        { key: "arus-kas", label: "Arus Kas" },
        { key: "pemasukan", label: "Pemasukan" },
        { key: "pengeluaran", label: "Pengeluaran" },
      ]}
      active={tab}
      onChange={setTab}
    />
  );

  const table = (
    <div className="bg-white rounded-md border border-line overflow-hidden">
      <div className="p-4 border-b border-line flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            {tab === "arus-kas" ? "Detail Arus Kas" : tab === "pemasukan" ? "Detail Pemasukan" : "Detail Pengeluaran"}
          </h3>
          <p className="text-xs text-faint mt-0.5">
            {fmtDate(dateFrom)} &ndash; {fmtDate(dateTo)}
          </p>
        </div>
        <span className="text-xs text-faint">{visibleRows.length} transaksi</span>
      </div>

      {visibleRows.length === 0 ? (
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
                {tab === "arus-kas" && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted">Jenis</th>
                )}
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted">Keterangan</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted hidden sm:table-cell">Ref</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted hidden md:table-cell">Kategori / Metode</th>
                {tab === "arus-kas" ? (
                  <>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-success">Masuk</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-danger">Keluar</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted hidden lg:table-cell">Saldo</th>
                  </>
                ) : (
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted">Jumlah</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(() => {
                return visibleRowsWithBalance.map((row, idx) => {
                  const saldo = row.balance;
                  const isMasuk = row.type === "masuk";
                  const isUmum = row.type === "keluar-umum";

                  return (
                    <tr
                      key={row.id + row.type}
                      className={`hover:bg-hover ${isMasuk ? "bg-success-soft/20" : "bg-danger-soft/10"}`}
                    >
                      <td className="py-2.5 px-4 text-xs text-faint">{idx + 1}</td>
                      <td className="py-2.5 px-4 text-xs text-ink whitespace-nowrap">{fmtDate(row.date)}</td>
                      {tab === "arus-kas" && (
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              isMasuk
                                ? "tone-success"
                                : isUmum
                                ? "tone-danger"
                                : "tone-warning"
                            }`}
                          >
                            {isMasuk ? "Pemasukan" : isUmum ? "Biaya Umum" : "Biaya Project"}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-4 text-xs text-ink max-w-[180px] truncate">{row.desc}</td>
                      <td className="py-2.5 px-4 text-xs text-muted hidden sm:table-cell truncate max-w-[120px]">{row.ref}</td>
                      <td className="py-2.5 px-4 hidden md:table-cell">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isMasuk
                              ? "bg-accent-soft text-accent"
                              : isUmum
                              ? generalKategoriBadge[row.meta.toLowerCase()] ?? "tone-neutral"
                              : "bg-accent-soft text-accent"
                          }`}
                        >
                          {row.meta}
                        </span>
                      </td>
                      {tab === "arus-kas" ? (
                        <>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                            {isMasuk ? <span className="text-success">{fmt(row.amount)}</span> : <span className="text-faint">—</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                            {!isMasuk ? <span className="text-danger">{fmt(row.amount)}</span> : <span className="text-faint">—</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap hidden lg:table-cell">
                            <span className={saldo >= 0 ? "text-ink" : "text-danger"}>{fmt(saldo)}</span>
                          </td>
                        </>
                      ) : (
                        <td className="py-2.5 px-4 text-right text-xs font-semibold whitespace-nowrap">
                          <span className={isMasuk ? "text-success" : "text-danger"}>{fmt(row.amount)}</span>
                        </td>
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-surface">
                <td colSpan={tab === "arus-kas" ? 5 : 4} className="py-3 px-4 text-xs font-semibold text-ink">
                  Total
                </td>
                {tab === "arus-kas" ? (
                  <>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-success whitespace-nowrap hidden md:table-cell" />
                    <td className="py-3 px-4 text-right text-xs font-semibold text-success whitespace-nowrap">{fmt(totalMasuk)}</td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-danger whitespace-nowrap">{fmt(totalKeluar)}</td>
                    <td className={`py-3 px-4 text-right text-xs font-semibold whitespace-nowrap hidden lg:table-cell ${arusBersih >= 0 ? "text-success" : "text-danger"}`}>
                      {fmt(arusBersih)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="hidden sm:table-cell" />
                    <td className="hidden md:table-cell" />
                    <td className="py-3 px-4 text-right text-xs font-semibold whitespace-nowrap">
                      <span className={tab === "pemasukan" ? "text-success" : "text-danger"}>
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
