"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";

/* ── Colours ── */
const LEAD_COLORS: Record<string, string> = {
  "New Lead": "#3b82f6",
  Contacted: "#eab308",
  Survey: "#a855f7",
  Deal: "#22c55e",
  Lost: "#ef4444",
};
const PROJECT_COLORS: Record<string, string> = {
  Planning: "#9ca3af",
  Design: "#3b82f6",
  Production: "#eab308",
  Installation: "#a855f7",
  Done: "#22c55e",
};
const PROJECT_LABEL: Record<string, string> = {
  Planning: "Planning",
  Design: "Design",
  Production: "Produksi",
  Installation: "Instalasi",
  Done: "Selesai",
};
const leadBadge: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Survey: "bg-purple-100 text-purple-700",
  Deal: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};
const projectStatusColors: Record<string, string> = {
  Design: "bg-blue-100 text-blue-700",
  Production: "bg-yellow-100 text-yellow-700",
  Installation: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
};

const LEAD_STATUSES = ["New Lead", "Contacted", "Survey", "Deal", "Lost"] as const;
const PROJECT_STATUSES = ["Planning", "Design", "Production", "Installation", "Done"] as const;

const formatCurrency = (v?: number) =>
  v == null ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const formatCurrencyShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
  return `${v}`;
};

/* Build last-N-months labels */
function lastNMonths(n: number) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    months.push({ key, label });
  }
  return months;
}

function monthKey(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* Custom tooltip for currency */
const CurrencyTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600">
          {p.name}: <span className="font-semibold text-gray-900">{formatCurrency(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const CountTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600">
          {p.name}: <span className="font-semibold text-gray-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function DashboardOverview() {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const { invoices, loading: li } = useInvoices();

  const loading = lc || ll || lp || li;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  /* ── Derived data ── */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dealWon = clients.filter((c) => c.lead_status === "Deal Won").length;
  const activeProjects = projects.filter((p) => p.status !== "Done").length;
  const dealLeads = leads.filter((l) => l.status === "Deal").length;
  const totalValue = projects.reduce((s, p) => s + (p.value ?? 0), 0);

  const totalTagihan = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTerkumpul = invoices.reduce((s, i) => s + i.paid_amount, 0);
  const totalPiutang = totalTagihan - totalTerkumpul;
  const overdueInvoices = invoices.filter(
    (i) => i.status !== "paid" && i.due_date && new Date(i.due_date) < today
  );
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  /* Donut: Lead pipeline */
  const leadPieData = LEAD_STATUSES.map((s) => ({
    name: s,
    value: leads.filter((l) => l.status === s).length,
    fill: LEAD_COLORS[s],
  })).filter((d) => d.value > 0);

  /* Bar: Project status (count + value) */
  const projectBarData = PROJECT_STATUSES.map((s) => ({
    name: PROJECT_LABEL[s],
    jumlah: projects.filter((p) => p.status === s).length,
    nilai: projects.filter((p) => p.status === s).reduce((sum, p) => sum + (p.value ?? 0), 0),
    fill: PROJECT_COLORS[s],
  }));

  /* Area: Monthly trend (last 6 months) */
  const months = lastNMonths(6);
  const trendData = months.map(({ key, label }) => ({
    label,
    Klien: clients.filter((c) => monthKey(c.created_at) === key).length,
    Lead: leads.filter((l) => monthKey(l.created_at) === key).length,
    Proyek: projects.filter((p) => monthKey(p.created_at) === key).length,
    Invoice: invoices.filter((i) => monthKey(i.created_at) === key).length,
  }));

  /* Recent */
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  const overdueProjects = projects.filter(
    (p) => p.status !== "Done" && p.deadline && new Date(p.deadline) < today
  );
  const followUpLeads = leads.filter(
    (l) =>
      l.status !== "Deal" &&
      l.status !== "Lost" &&
      l.follow_up_date &&
      new Date(l.follow_up_date) <= today
  );

  return (
    <div className="space-y-6">
      {/* ── Alert banners ── */}
      {(overdueProjects.length > 0 || followUpLeads.length > 0) && (
        <div className="space-y-2">
          {overdueProjects.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs flex-shrink-0">!</span>
              <span className="text-red-800 font-medium">
                {overdueProjects.length} proyek melewati deadline:
              </span>
              <span className="text-red-700 truncate">
                {overdueProjects.slice(0, 3).map((p) => p.name).join(", ")}
                {overdueProjects.length > 3 && ` +${overdueProjects.length - 3} lainnya`}
              </span>
              <Link href="/projects" className="ml-auto text-xs text-red-600 hover:underline flex-shrink-0">
                Lihat →
              </Link>
            </div>
          )}
          {followUpLeads.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs flex-shrink-0">!</span>
              <span className="text-orange-800 font-medium">
                {followUpLeads.length} lead perlu follow-up hari ini
              </span>
              <Link href="/leads" className="ml-auto text-xs text-orange-600 hover:underline flex-shrink-0">
                Lihat →
              </Link>
            </div>
          )}
          {overdueInvoices.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
              <span className="w-5 h-5 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs flex-shrink-0">!</span>
              <span className="text-yellow-800 font-medium">
                {overdueInvoices.length} invoice jatuh tempo belum terbayar
              </span>
              <Link href="/invoices" className="ml-auto text-xs text-yellow-700 hover:underline flex-shrink-0">
                Lihat →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Client</p>
          <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-400 mt-1">{dealWon} deal won</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Lead</p>
          <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
          <p className="text-xs text-gray-400 mt-1">{dealLeads} deal closing</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Aktif</p>
          <p className="text-3xl font-bold text-gray-900">{activeProjects}</p>
          <p className="text-xs text-gray-400 mt-1">{projects.filter((p) => p.status === "Done").length} selesai</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Nilai Proyek</p>
          <p className="text-3xl font-bold text-gray-900">{formatCurrencyShort(totalValue)}</p>
          <p className="text-xs text-gray-400 mt-1">{projects.length} proyek</p>
        </div>
      </div>

      {/* ── Financial KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Tagihan</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrencyShort(totalTagihan)}</p>
          <p className="text-xs text-gray-400 mt-1">{invoices.length} invoice</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Terkumpul</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrencyShort(totalTerkumpul)}</p>
          <p className="text-xs text-gray-400 mt-1">
            {totalTagihan > 0 ? Math.round((totalTerkumpul / totalTagihan) * 100) : 0}% dari total tagihan
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Piutang</p>
          <p className={`text-2xl font-bold ${totalPiutang > 0 ? "text-red-500" : "text-gray-900"}`}>
            {formatCurrencyShort(totalPiutang)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{overdueInvoices.length} invoice jatuh tempo</p>
        </div>
      </div>

      {/* ── Charts row 1: Pie + Bar ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut: Lead Pipeline */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Pipeline Lead</h3>
            <Link href="/leads" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-400">Belum ada data lead</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="h-48 flex-1 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="52%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as { name: string; value: number };
                        return (
                          <div className="bg-white border border-gray-100 shadow-lg rounded-lg p-2 text-xs">
                            <p className="font-semibold">{d.name}</p>
                            <p>{d.value} lead</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 flex-shrink-0">
                {LEAD_STATUSES.map((s) => {
                  const cnt = leads.filter((l) => l.status === s).length;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: LEAD_COLORS[s] }} />
                      <span className="text-xs text-gray-600 w-20">{s}</span>
                      <span className="text-xs font-semibold text-gray-900">{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bar: Project Status */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800">Status Proyek</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {projects.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-400">Belum ada data proyek</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectBarData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CountTooltip />} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="jumlah" name="Jumlah" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Chart row 2: Area trend ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Tren 6 Bulan Terakhir</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="gradKlien" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLead" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradProyek" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradInvoice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CountTooltip />} cursor={{ stroke: "#e5e7eb" }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              <Area type="monotone" dataKey="Klien" stroke="#3b82f6" strokeWidth={2} fill="url(#gradKlien)" dot={{ r: 3, fill: "#3b82f6" }} />
              <Area type="monotone" dataKey="Lead" stroke="#a855f7" strokeWidth={2} fill="url(#gradLead)" dot={{ r: 3, fill: "#a855f7" }} />
              <Area type="monotone" dataKey="Proyek" stroke="#22c55e" strokeWidth={2} fill="url(#gradProyek)" dot={{ r: 3, fill: "#22c55e" }} />
              <Area type="monotone" dataKey="Invoice" stroke="#f97316" strokeWidth={2} fill="url(#gradInvoice)" dot={{ r: 3, fill: "#f97316" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Chart row 3: Project value by status ── */}
      {totalValue > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Nilai Proyek per Status</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectBarData.filter((d) => d.nilai > 0)}
                barSize={36}
                margin={{ top: 4, right: 4, bottom: 0, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatCurrencyShort}
                />
                <Tooltip content={<CurrencyTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="nilai" name="Nilai" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Recent tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Client Terbaru</h3>
            <Link href="/clients" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentClients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 text-xs">{c.name}</p>
                    <p className="text-gray-400 text-xs">{c.source || "-"}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.lead_status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${leadBadge[c.lead_status] || "bg-gray-100 text-gray-600"}`}>
                        {c.lead_status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {recentClients.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-xs">Belum ada client</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Project Terbaru</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentProjects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 text-xs">{p.name}</p>
                    <p className="text-gray-400 text-xs">{formatCurrency(p.value)}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${projectStatusColors[p.status] || "bg-gray-100 text-gray-600"}`}>
                      {PROJECT_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentProjects.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-xs">Belum ada project</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Invoice Terbaru</h3>
            <Link href="/invoices" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentInvoices.map((inv) => {
                const outstanding = inv.total_amount - inv.paid_amount;
                const statusColors: Record<string, string> = {
                  draft: "bg-gray-100 text-gray-600",
                  sent: "bg-blue-100 text-blue-700",
                  partial: "bg-yellow-100 text-yellow-700",
                  paid: "bg-green-100 text-green-700",
                  overdue: "bg-red-100 text-red-700",
                };
                const statusLabels: Record<string, string> = {
                  draft: "Draft", sent: "Terkirim", partial: "Sebagian", paid: "Lunas", overdue: "Jatuh Tempo",
                };
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 text-xs">{inv.invoice_number}</p>
                      <p className="text-gray-400 text-xs">
                        {outstanding > 0 ? `Sisa: ${formatCurrencyShort(outstanding)}` : "Lunas"}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {statusLabels[inv.status] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {recentInvoices.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-xs">Belum ada invoice</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
