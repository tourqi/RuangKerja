"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useAllPayments } from "@/hooks/usePayments";
import { useAllExpenses } from "@/hooks/useExpenses";
import { useApprovedRabTotals } from "@/hooks/useRab";
import { computeProjectProfitLoss } from "@/utils/profitLossCalculations";
import Link from "next/link";
import {
  PieChart, Pie, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";

const LEAD_COLORS: Record<string, string> = {
  "New Lead": "#3b82f6", Contacted: "#eab308", Survey: "#a855f7", Deal: "#22c55e", Lost: "#ef4444",
};
const PROJECT_LABEL: Record<string, string> = {
  Planning: "Planning", Design: "Design", Production: "Produksi", Installation: "Instalasi", Done: "Selesai",
};
const projectStatusBadge: Record<string, string> = {
  Planning: "bg-gray-100 text-gray-600", Design: "bg-blue-100 text-blue-700",
  Production: "bg-yellow-100 text-yellow-700", Installation: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
};
const invoiceStatusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-500", sent: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700", paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-600",
};
const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft", sent: "Terkirim", partial: "Sebagian", paid: "Lunas", overdue: "Jatuh Tempo",
};
const LEAD_STATUSES = ["New Lead", "Contacted", "Survey", "Deal", "Lost"] as const;
const PROJECT_STATUSES = ["Planning", "Design", "Production", "Installation", "Done"] as const;

const fmt = (v?: number) =>
  v == null ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return `${v}`;
};

function lastNMonths(n: number) {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
    });
  }
  return out;
}
function monthKey(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function currentMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

const CurrencyTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs space-y-0.5">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};
const CountTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs space-y-0.5">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600">{p.name}: <b className="text-gray-900">{p.value}</b></p>
      ))}
    </div>
  );
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

function StatCard({
  label, value, sub, valueClass = "text-gray-900", badge,
}: {
  label: string; value: string | number; sub?: string; valueClass?: string; badge?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider leading-tight">{label}</p>
        {badge}
      </div>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
    </Card>
  );
}

const BlnIniBadge = () => (
  <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-full whitespace-nowrap">Bln ini</span>
);

export default function DashboardOverview() {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const { invoices, loading: li } = useInvoices();
  const { payments } = useAllPayments();
  const { expenses } = useAllExpenses();
  const { totals: rabTotals } = useApprovedRabTotals();

  const getProjectValue = (p: { lead_id?: string; value?: number }) =>
    p.lead_id && rabTotals[p.lead_id] != null
      ? rabTotals[p.lead_id]
      : (p.value ?? 0);

  const loading = lc || ll || lp || li;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const thisMonth = currentMonthKey();

  /* bisnis */
  const activeProjects = projects.filter((p) => p.status !== "Done").length;
  const dealLeads = leads.filter((l) => l.status === "Deal").length;
  const totalValue = projects.reduce((s, p) => s + getProjectValue(p), 0);
  const overdueProjects = projects.filter((p) => p.status !== "Done" && p.deadline && new Date(p.deadline) < today);
  const followUpLeads = leads.filter(
    (l) => l.status !== "Deal" && l.status !== "Lost" && l.follow_up_date && new Date(l.follow_up_date) <= today
  );

  /* keuangan all-time */
  const totalTagihan = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTerkumpul = payments.reduce((s, p) => s + p.amount, 0);
  const totalPengeluaran = expenses.reduce((s, e) => s + e.jumlah, 0);
  const totalPiutang = totalTagihan - totalTerkumpul;
  const labaBersih = totalTerkumpul - totalPengeluaran;
  const collectionRate = totalTagihan > 0 ? Math.round((totalTerkumpul / totalTagihan) * 100) : 0;
  const overdueInvoices = invoices.filter((i) => i.status !== "paid" && i.due_date && new Date(i.due_date) < today);

  /* keuangan bulan ini */
  const pemasukanBulanIni = payments.filter((p) => monthKey(p.payment_date) === thisMonth).reduce((s, p) => s + p.amount, 0);
  const pengeluaranBulanIni = expenses.filter((e) => monthKey(e.tanggal) === thisMonth).reduce((s, e) => s + e.jumlah, 0);
  const arusBulanIni = pemasukanBulanIni - pengeluaranBulanIni;

  /* chart data */
  const leadPieData = LEAD_STATUSES.map((s) => ({
    name: s, value: leads.filter((l) => l.status === s).length, fill: LEAD_COLORS[s],
  })).filter((d) => d.value > 0);

  const projectBarData = PROJECT_STATUSES.map((s) => ({
    name: PROJECT_LABEL[s],
    jumlah: projects.filter((p) => p.status === s).length,
  }));

  const months = lastNMonths(6);
  const financialTrend = months.map(({ key, label }) => ({
    label,
    Pemasukan: payments.filter((p) => monthKey(p.payment_date) === key).reduce((s, p) => s + p.amount, 0),
    Pengeluaran: expenses.filter((e) => monthKey(e.tanggal) === key).reduce((s, e) => s + e.jumlah, 0),
  }));
  const activityTrend = months.map(({ key, label }) => ({
    label,
    Lead: leads.filter((l) => monthKey(l.created_at) === key).length,
    Proyek: projects.filter((p) => monthKey(p.created_at) === key).length,
    Invoice: invoices.filter((i) => monthKey(i.invoice_date || i.created_at) === key).length,
  }));

  /* tables */
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.invoice_date || b.created_at || 0).getTime() - new Date(a.invoice_date || a.created_at || 0).getTime())
    .slice(0, 5);
  const labaRows = computeProjectProfitLoss(projects, expenses, invoices, getProjectValue).rows
    .slice(0, 5)
    .map(({ project: p, laba, margin }) => ({ p, laba, margin }));

  return (
    <div className="space-y-4">

      {/* ── Alerts ── */}
      {(overdueProjects.length > 0 || followUpLeads.length > 0 || overdueInvoices.length > 0) && (
        <div className="space-y-2">
          {overdueProjects.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-xs">
              <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-bold flex-shrink-0">!</span>
              <span className="text-red-800 font-semibold">{overdueProjects.length} proyek lewat deadline</span>
              <span className="text-red-600 truncate hidden sm:block">
                {overdueProjects.slice(0, 3).map((p) => p.name).join(", ")}
                {overdueProjects.length > 3 && ` +${overdueProjects.length - 3} lainnya`}
              </span>
              <Link href="/projects" className="ml-auto text-red-500 hover:underline flex-shrink-0">Lihat →</Link>
            </div>
          )}
          {followUpLeads.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs">
              <span className="w-4 h-4 rounded-full bg-orange-400 text-white flex items-center justify-center font-bold flex-shrink-0">!</span>
              <span className="text-orange-800 font-semibold">{followUpLeads.length} lead perlu follow-up hari ini</span>
              <Link href="/leads" className="ml-auto text-orange-500 hover:underline flex-shrink-0">Lihat →</Link>
            </div>
          )}
          {overdueInvoices.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-xs">
              <span className="w-4 h-4 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold flex-shrink-0">!</span>
              <span className="text-yellow-800 font-semibold">{overdueInvoices.length} invoice jatuh tempo belum terbayar</span>
              <Link href="/invoices" className="ml-auto text-yellow-600 hover:underline flex-shrink-0">Lihat →</Link>
            </div>
          )}
        </div>
      )}

      {/* ── Row 1: KPI bisnis ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Klien" value={clients.length}
          sub={`${clients.filter((c) => c.lead_status === "Deal Won").length} deal won`} />
        <StatCard label="Total Lead" value={leads.length}
          sub={`${dealLeads} closing · ${leads.filter((l) => l.status === "Lost").length} lost`} />
        <StatCard label="Proyek Aktif" value={activeProjects}
          sub={`${projects.filter((p) => p.status === "Done").length} selesai · ${projects.length} total`} />
        <StatCard label="Nilai Semua Proyek" value={fmtShort(totalValue)} sub={`${projects.length} proyek`} />
      </div>

      {/* ── Row 2: KPI keuangan bulan ini ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Pemasukan"
          value={fmtShort(pemasukanBulanIni)}
          sub={fmt(pemasukanBulanIni)}
          valueClass="text-green-600"
          badge={<BlnIniBadge />}
        />
        <StatCard
          label="Pengeluaran"
          value={fmtShort(pengeluaranBulanIni)}
          sub={fmt(pengeluaranBulanIni)}
          valueClass="text-red-500"
          badge={<BlnIniBadge />}
        />
        <StatCard
          label="Arus Kas Bersih"
          value={fmtShort(arusBulanIni)}
          sub={`${arusBulanIni >= 0 ? "Surplus" : "Defisit"} · ${fmt(arusBulanIni)}`}
          valueClass={arusBulanIni >= 0 ? "text-blue-600" : "text-orange-500"}
          badge={<BlnIniBadge />}
        />
      </div>

      {/* ── Row 3: KPI keuangan kumulatif ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Tagihan" value={fmtShort(totalTagihan)}
          sub={`${invoices.length} invoice · ${collectionRate}% terkumpul`} />
        <StatCard label="Total Terkumpul" value={fmtShort(totalTerkumpul)}
          sub={`${invoices.filter((i) => i.status === "paid").length} invoice lunas`}
          valueClass="text-green-600" />
        <StatCard label="Total Pengeluaran" value={fmtShort(totalPengeluaran)}
          sub={`${expenses.length} transaksi`}
          valueClass="text-red-500" />
        <Card className="p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Laba Bersih</p>
          <p className={`text-2xl font-bold mt-1 ${labaBersih >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtShort(labaBersih)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Piutang: {fmtShort(totalPiutang)}
            {overdueInvoices.length > 0 && <span className="text-red-400"> · {overdueInvoices.length} jatuh tempo</span>}
          </p>
        </Card>
      </div>

      {/* ── Row 4: Charts kecil ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Pipeline Lead</h3>
            <Link href="/leads" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-xs text-gray-400">Belum ada data lead</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-44 flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leadPieData} cx="50%" cy="50%" innerRadius="50%" outerRadius="78%" paddingAngle={2} dataKey="value" />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { name: string; value: number };
                      return (
                        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-2.5 text-xs">
                          <p className="font-semibold text-gray-700">{d.name}</p>
                          <p className="text-gray-500">{d.value} lead</p>
                        </div>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-shrink-0">
                {LEAD_STATUSES.map((s) => {
                  const cnt = leads.filter((l) => l.status === s).length;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: LEAD_COLORS[s] }} />
                      <span className="text-xs text-gray-500 w-20">{s}</span>
                      <span className="text-xs font-bold text-gray-900">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Status Proyek</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {projects.length === 0 ? (
            <div className="flex items-center justify-center h-44 text-xs text-gray-400">Belum ada data proyek</div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectBarData} barSize={26} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CountTooltip />} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="jumlah" name="Jumlah" radius={[4, 4, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── Row 5: Tren keuangan ── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Tren Keuangan 6 Bulan</h3>
          <Link href="/reports" className="text-xs text-blue-600 hover:underline">Laporan lengkap →</Link>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={financialTrend} margin={{ top: 4, right: 4, bottom: 0, left: 20 }}>
              <defs>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gK" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip content={<CurrencyTooltip />} cursor={{ stroke: "#e5e7eb" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Area type="monotone" dataKey="Pemasukan" stroke="#22c55e" strokeWidth={2} fill="url(#gP)" dot={{ r: 3, fill: "#22c55e" }} />
              <Area type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} fill="url(#gK)" dot={{ r: 3, fill: "#ef4444" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Row 6: Tren aktivitas ── */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Tren Aktivitas 6 Bulan</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityTrend} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CountTooltip />} cursor={{ stroke: "#e5e7eb" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Area type="monotone" dataKey="Lead" stroke="#a855f7" strokeWidth={2} fill="url(#gL)" dot={{ r: 3, fill: "#a855f7" }} />
              <Area type="monotone" dataKey="Proyek" stroke="#3b82f6" strokeWidth={2} fill="url(#gPr)" dot={{ r: 3, fill: "#3b82f6" }} />
              <Area type="monotone" dataKey="Invoice" stroke="#f97316" strokeWidth={2} fill="url(#gI)" dot={{ r: 3, fill: "#f97316" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Row 7: Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Proyek terbaru */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Proyek Terbaru</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Semua →</Link>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {recentProjects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="text-xs font-medium text-gray-900 hover:underline block truncate max-w-[140px]">{p.name}</Link>
                    <p className="text-xs text-gray-400">{fmt(getProjectValue(p))}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${projectStatusBadge[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {PROJECT_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentProjects.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-xs text-gray-400">Belum ada proyek</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Invoice terbaru */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Invoice Terbaru</h3>
            <Link href="/invoices" className="text-xs text-blue-600 hover:underline">Semua →</Link>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {recentInvoices.map((inv) => {
                const proj = projects.find((p) => p.id === inv.project_id);
                const cl = clients.find((c) => c.id === inv.client_id);
                const outstanding = inv.total_amount - inv.paid_amount;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-xs font-medium text-gray-900 hover:underline">{inv.invoice_number}</Link>
                      <p className="text-xs text-gray-400 truncate max-w-[140px]">
                        {proj?.name ?? cl?.name ?? "—"}
                        {outstanding > 0 && <span className="ml-1">· sisa {fmtShort(outstanding)}</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${invoiceStatusBadge[inv.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {invoiceStatusLabels[inv.status] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {recentInvoices.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-xs text-gray-400">Belum ada invoice</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Laba per proyek */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Laba per Proyek</h3>
            <Link href="/reports" className="text-xs text-blue-600 hover:underline">Laporan →</Link>
          </div>
          <table className="w-full">
            <tbody className="divide-y divide-gray-50">
              {labaRows.map(({ p, laba, margin }) => (
                <tr key={p.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3">
                    <Link href={`/projects/${p.id}`} className="text-xs font-medium text-gray-900 hover:underline block truncate max-w-[140px]">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className={`text-xs font-semibold ${laba >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtShort(laba)}</p>
                    {margin !== null && (
                      <p className={`text-xs ${margin < 0 ? "text-red-400" : margin < 20 ? "text-yellow-500" : "text-green-400"}`}>{margin}%</p>
                    )}
                  </td>
                </tr>
              ))}
              {labaRows.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-xs text-gray-400">Belum ada data laba</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

    </div>
  );
}
