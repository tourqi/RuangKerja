"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useAllPayments } from "@/hooks/usePayments";
import { useAllExpenses } from "@/hooks/useExpenses";
import { useApprovedRabTotals } from "@/hooks/useRab";
import { computeProjectProfitLoss } from "@/utils/profitLossCalculations";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import Link from "next/link";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { ExpenseCategory } from "@/types/db";
import type { Source } from "@/constants/options";
import {
  UsersIcon, FunnelIcon, BuildingIcon, BanknotesIcon, InboxDownIcon, RefreshIcon, ChartBarIcon,
  CoinsIcon, CheckCircleIcon, ClockIcon, HomeIcon, CameraIcon, MusicNoteIcon, GlobeIcon, LinkIcon,
  MapPinIcon, ShoppingBagIcon, MegaphoneIcon,
} from "@/components/icons/AppIcons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const LEAD_COLORS: Record<string, string> = {
  "New Lead": "#3b82f6", Contacted: "#eab308", Survey: "#a855f7", Deal: "#6366f1", "Deal Won": "#22c55e", "Deal Lost": "#ef4444",
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
const LEAD_STATUSES = ["New Lead", "Contacted", "Survey", "Deal", "Deal Won", "Deal Lost"] as const;
const PROJECT_STATUSES = ["Planning", "Design", "Production", "Installation", "Done"] as const;

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: "Material", jasa: "Jasa", transport: "Transport", lainnya: "Lainnya",
};
const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  material: "#3b82f6", jasa: "#a855f7", transport: "#f97316", lainnya: "#9ca3af",
};
const SOURCE_ICONS: Record<string, { icon: IconComponent; tint: string }> = {
  Instagram: { icon: CameraIcon, tint: "bg-pink-50 text-pink-500" },
  TikTok: { icon: MusicNoteIcon, tint: "bg-gray-100 text-gray-600" },
  Website: { icon: GlobeIcon, tint: "bg-blue-50 text-blue-600" },
  Referral: { icon: LinkIcon, tint: "bg-green-50 text-green-600" },
  "Walk-in": { icon: MapPinIcon, tint: "bg-amber-50 text-amber-600" },
  Marketplace: { icon: ShoppingBagIcon, tint: "bg-orange-50 text-orange-600" },
  "Ads (Google/Facebook)": { icon: MegaphoneIcon, tint: "bg-purple-50 text-purple-600" },
};

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

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

/** Small inline chip for quick top-line numbers — deliberately not another big box. */
function QuickStat({
  icon: IconEl, tint = "bg-gray-50 text-gray-500", label, value, valueClass = "text-gray-900",
}: { icon: IconComponent; tint?: string; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 shrink-0">
      <div className={`w-8 h-8 rounded-lg p-1.5 shrink-0 ${tint}`}><IconEl /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-tight whitespace-nowrap">{label}</p>
        <p className={`text-sm font-bold leading-tight whitespace-nowrap ${valueClass}`}>{value}</p>
      </div>
    </div>
  );
}

/** Two-sided comparison card, e.g. collected vs outstanding — mirrors a "male vs female" split. */
function SplitCompareCard({
  title, total,
  left, right,
}: {
  title: string; total: string;
  left: { label: string; value: string; pct: number; color: string };
  right: { label: string; value: string; pct: number; color: string };
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-4">{total}</p>
      <div className="flex items-center justify-between text-xs mb-2 gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: left.color }} />
            <span className="text-gray-500">{left.label}</span>
          </div>
          <p className="text-base font-bold mt-0.5" style={{ color: left.color }}>{left.pct}%</p>
          <p className="text-[11px] text-gray-400">{left.value}</p>
        </div>
        <span className="text-[10px] text-gray-300 font-medium self-center">vs</span>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-gray-500">{right.label}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: right.color }} />
          </div>
          <p className="text-base font-bold mt-0.5" style={{ color: right.color }}>{right.pct}%</p>
          <p className="text-[11px] text-gray-400">{right.value}</p>
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
        <div style={{ width: `${left.pct}%`, background: left.color }} />
        <div style={{ width: `${right.pct}%`, background: right.color }} />
      </div>
    </Card>
  );
}

/** Headline number + a 2x2 grid of icon tiles, e.g. project summary breakdown. */
function IconStatGrid({
  title, total, sub, tiles,
}: {
  title: string; total: string; sub?: string;
  tiles: { icon: IconComponent; label: string; value: string; tint: string }[];
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{total}</p>
      {sub && <p className="text-xs text-gray-400 mb-1">{sub}</p>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 mt-3">
        {tiles.map((t) => {
          const TileIcon = t.icon;
          return (
            <div key={t.label} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg p-1.5 shrink-0 ${t.tint}`}><TileIcon /></div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 leading-tight truncate">{t.value}</p>
                <p className="text-[11px] text-gray-400 leading-tight truncate">{t.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Donut gauge with the percentage centered — e.g. collection rate. */
function RadialPercentCard({
  title, total, sub, pct, color,
}: { title: string; total: string; sub?: string; pct: number; color: string }) {
  const safePct = Math.max(0, Math.min(100, pct));
  const data = [{ name: "v", value: safePct }, { name: "rest", value: 100 - safePct }];
  return (
    <Card className="p-5 flex flex-col">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{total}</p>
      <div className="relative h-28 flex items-center justify-center flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              <Cell fill={color} />
              <Cell fill="#f3f4f6" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{safePct}%</span>
        </div>
      </div>
      {sub && <p className="text-xs text-gray-400 text-center mt-1">{sub}</p>}
    </Card>
  );
}

/** Horizontal bars with the value printed inside, plus a colored-dot legend with percentages. */
function HorizontalBarBreakdownCard({
  title, linkHref, linkLabel, rows, total,
}: {
  title: string; linkHref?: string; linkLabel?: string;
  rows: { label: string; value: number; color: string }[]; total: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {linkHref && <Link href={linkHref} className="text-xs text-blue-600 hover:underline">{linkLabel ?? "Lihat semua"}</Link>}
      </div>
      {rows.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-xs text-gray-400">Belum ada data</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-x-6 gap-y-4">
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{r.label}</span>
                <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md flex items-center justify-end px-2 text-[11px] font-semibold text-white transition-all"
                    style={{ width: `${r.value > 0 ? Math.max(10, (r.value / max) * 100) : 0}%`, background: r.color }}
                  >
                    {r.value > 0 && r.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2.5 lg:pl-4 lg:border-l lg:border-gray-50 lg:min-w-[140px]">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                <span className="text-gray-500">{r.label}</span>
                <span className="ml-auto font-bold text-gray-900">{total > 0 ? ((r.value / total) * 100).toFixed(1) : "0.0"}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/** Compact ring gauge with a two-way comparison bar underneath. */
function MiniRingStatCard({
  title, value, pct, color, compareLeft, compareRight,
}: {
  title: string; value: string | number; pct: number; color: string;
  compareLeft: { label: string; value: string | number; pct: number; color: string };
  compareRight: { label: string; value: string | number; pct: number; color: string };
}) {
  const safePct = Math.max(0, Math.min(100, pct));
  const data = [{ name: "v", value: safePct }, { name: "rest", value: 100 - safePct }];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="relative w-14 h-14 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                <Cell fill={color} />
                <Cell fill="#f3f4f6" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-gray-800">{safePct}%</span>
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-500">{compareLeft.label}</span>
          <span className="text-gray-500">{compareRight.label}</span>
        </div>
        <div className="flex items-center justify-between text-sm font-bold mb-1.5">
          <span style={{ color: compareLeft.color }}>{compareLeft.value}</span>
          <span style={{ color: compareRight.color }}>{compareRight.value}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden flex bg-gray-100">
          <div style={{ width: `${compareLeft.pct}%`, background: compareLeft.color }} />
          <div style={{ width: `${compareRight.pct}%`, background: compareRight.color }} />
        </div>
      </div>
    </Card>
  );
}

/** Rows of icon + label + value + percentage — e.g. lead source breakdown. */
function IconListCard({
  title, rows,
}: {
  title: string;
  rows: { icon: IconComponent; tint: string; label: string; value: number; pct: number }[];
}) {
  return (
    <Card className="p-5 h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3.5">
        {rows.map((r) => {
          const RowIcon = r.icon;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg p-1.5 shrink-0 ${r.tint}`}><RowIcon /></div>
              <span className="text-sm text-gray-700 flex-1 truncate">{r.label}</span>
              <span className="text-sm font-semibold text-gray-900">{r.value}</span>
              <span className="text-xs font-bold w-14 text-right text-gray-500">{r.pct}%</span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Belum ada data</p>}
      </div>
    </Card>
  );
}

/** Full-width bars with value + percentage printed at the end — e.g. spend by category. */
function LabeledBarListCard({
  title, rows, total, valueFormatter = (v) => `${v}`,
}: {
  title: string; rows: { label: string; value: number; color: string }[]; total: number;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-5 h-full">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-600">{r.label}</span>
              <span className="text-gray-400">
                {valueFormatter(r.value)}{" "}
                <span className="font-semibold text-gray-600">({total > 0 ? ((r.value / total) * 100).toFixed(1) : "0.0"}%)</span>
              </span>
            </div>
            <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Belum ada data</p>}
      </div>
    </Card>
  );
}

export default function DashboardOverview() {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const { invoices, loading: li } = useInvoices();
  const { payments } = useAllPayments();
  const { expenses } = useAllExpenses();
  const { totals: rabTotals } = useApprovedRabTotals();

  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);

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
  const doneProjects = projects.filter((p) => p.status === "Done").length;
  const dealLeads = leads.filter((l) => l.status === "Deal Won").length;
  const lostLeads = leads.filter((l) => l.status === "Deal Lost").length;
  const totalValue = projects.reduce((s, p) => s + getProjectValue(p), 0);
  const overdueProjects = projects.filter((p) => p.status !== "Done" && p.deadline && new Date(p.deadline) < today);
  const followUpLeads = leads.filter(
    (l) => l.status !== "Deal Won" && l.status !== "Deal Lost" && l.follow_up_date && new Date(l.follow_up_date) <= today
  );
  const activeClientIds = new Set(projects.filter((p) => p.status !== "Done").map((p) => p.client_id));

  /* keuangan all-time */
  const totalTagihan = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTerkumpul = payments.reduce((s, p) => s + p.amount, 0);
  const totalPengeluaran = expenses.reduce((s, e) => s + e.jumlah, 0);
  const totalPiutang = Math.max(0, totalTagihan - totalTerkumpul);
  const labaBersih = totalTerkumpul - totalPengeluaran;
  const collectionRate = totalTagihan > 0 ? Math.round((totalTerkumpul / totalTagihan) * 100) : 0;
  const overdueInvoices = invoices.filter((i) => i.status !== "paid" && i.due_date && new Date(i.due_date) < today);

  /* keuangan bulan ini */
  const pemasukanBulanIni = payments.filter((p) => monthKey(p.payment_date) === thisMonth).reduce((s, p) => s + p.amount, 0);
  const pengeluaranBulanIni = expenses.filter((e) => monthKey(e.tanggal) === thisMonth).reduce((s, e) => s + e.jumlah, 0);
  const arusBulanIni = pemasukanBulanIni - pengeluaranBulanIni;

  /* chart data */
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

  /* breakdown: sumber lead */
  const sourceRows = (Object.keys(SOURCE_ICONS) as Source[])
    .map((s) => {
      const count = leads.filter((l) => (l.source || clients.find((c) => c.id === l.client_id)?.source) === s).length;
      return { icon: SOURCE_ICONS[s].icon, tint: SOURCE_ICONS[s].tint, label: s, value: count, pct: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0 };
    })
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  /* breakdown: pengeluaran per kategori */
  const expenseCategoryRows = (Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[])
    .map((k) => ({
      label: EXPENSE_CATEGORY_LABELS[k],
      value: expenses.filter((e) => e.kategori === k).reduce((s, e) => s + e.jumlah, 0),
      color: EXPENSE_CATEGORY_COLORS[k],
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

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

      {/* ── Quick stats strip ── */}
      <div className="flex flex-wrap gap-2.5">
        <QuickStat icon={UsersIcon} tint="bg-indigo-50 text-indigo-600" label="Total Klien" value={String(clients.length)} />
        <QuickStat icon={FunnelIcon} tint="bg-purple-50 text-purple-600" label="Total Lead" value={String(leads.length)} />
        <QuickStat icon={BuildingIcon} tint="bg-blue-50 text-blue-600" label="Proyek Aktif" value={String(activeProjects)} />
        <QuickStat icon={BanknotesIcon} tint="bg-teal-50 text-teal-600" label="Nilai Semua Proyek" value={fmtShort(totalValue)} />
        <QuickStat icon={InboxDownIcon} tint="bg-green-50 text-green-600" label="Pemasukan Bln Ini" value={fmtShort(pemasukanBulanIni)} valueClass="text-green-600" />
        <QuickStat icon={RefreshIcon} tint="bg-sky-50 text-sky-600" label="Arus Kas Bln Ini" value={fmtShort(arusBulanIni)} valueClass={arusBulanIni >= 0 ? "text-blue-600" : "text-orange-500"} />
        <QuickStat icon={ChartBarIcon} tint="bg-amber-50 text-amber-600" label="Laba Bersih" value={fmtShort(labaBersih)} valueClass={labaBersih >= 0 ? "text-green-600" : "text-red-500"} />
      </div>

      {/* ── Row 1: penagihan, ringkasan proyek, tingkat penagihan ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <SplitCompareCard
          title="Status Penagihan Invoice"
          total={fmt(totalTagihan)}
          left={{ label: "Terkumpul", value: fmtShort(totalTerkumpul), pct: collectionRate, color: "#22c55e" }}
          right={{ label: "Piutang", value: fmtShort(totalPiutang), pct: 100 - collectionRate, color: "#f97316" }}
        />
        <IconStatGrid
          title="Ringkasan Proyek"
          total={String(projects.length)}
          sub={`${activeProjects} sedang berjalan`}
          tiles={[
            { icon: CoinsIcon, label: "Rata-rata Nilai", value: fmtShort(projects.length > 0 ? totalValue / projects.length : 0), tint: "bg-indigo-50 text-indigo-600" },
            { icon: CheckCircleIcon, label: "Selesai", value: String(doneProjects), tint: "bg-green-50 text-green-600" },
            { icon: ClockIcon, label: "Lewat Deadline", value: String(overdueProjects.length), tint: "bg-red-50 text-red-600" },
            { icon: HomeIcon, label: "Klien Aktif", value: String(activeClientIds.size), tint: "bg-blue-50 text-blue-600" },
          ]}
        />
        <RadialPercentCard
          title="Tingkat Penagihan"
          total={fmtShort(totalTerkumpul)}
          sub={`dari total tagihan ${fmtShort(totalTagihan)}`}
          pct={collectionRate}
          color="#6366f1"
        />
      </div>

      {/* ── Row 2: pipeline lead + ring stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <HorizontalBarBreakdownCard
            title="Pipeline Lead per Status"
            linkHref="/leads"
            rows={LEAD_STATUSES.map((s) => ({ label: s, value: leads.filter((l) => l.status === s).length, color: LEAD_COLORS[s] }))}
            total={leads.length}
          />
        </div>
        <div className="flex flex-col gap-3">
          <MiniRingStatCard
            title="Proyek Selesai"
            value={doneProjects}
            pct={projects.length > 0 ? Math.round((doneProjects / projects.length) * 100) : 0}
            color="#22c55e"
            compareLeft={{ label: "Aktif", value: activeProjects, pct: projects.length > 0 ? (activeProjects / projects.length) * 100 : 0, color: "#3b82f6" }}
            compareRight={{ label: "Selesai", value: doneProjects, pct: projects.length > 0 ? (doneProjects / projects.length) * 100 : 0, color: "#22c55e" }}
          />
          <MiniRingStatCard
            title="Lead Closing Rate"
            value={dealLeads}
            pct={leads.length > 0 ? Math.round((dealLeads / leads.length) * 100) : 0}
            color="#a855f7"
            compareLeft={{ label: "Deal Won", value: dealLeads, pct: leads.length > 0 ? (dealLeads / leads.length) * 100 : 0, color: "#22c55e" }}
            compareRight={{ label: "Deal Lost", value: lostLeads, pct: leads.length > 0 ? (lostLeads / leads.length) * 100 : 0, color: "#ef4444" }}
          />
        </div>
      </div>

      {/* ── Row 3: sumber lead + pengeluaran per kategori ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <IconListCard title="Sumber Lead" rows={sourceRows} />
        <LabeledBarListCard
          title="Pengeluaran per Kategori"
          rows={expenseCategoryRows}
          total={expenseCategoryRows.reduce((s, r) => s + r.value, 0)}
          valueFormatter={fmtShort}
        />
      </div>

      {/* ── Row 4: status proyek (bar) ── */}
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
