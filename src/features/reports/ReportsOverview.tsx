"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useAllPayments } from "@/hooks/usePayments";
import { useAllExpenses } from "@/hooks/useExpenses";
import { useState } from "react";
import Link from "next/link";
import { LaporanPendapatan } from "./LaporanPendapatan";
import { LaporanPengeluaran } from "./LaporanPengeluaran";

const formatCurrency = (v?: number) =>
  v == null
    ? "Rp 0"
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const pct = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 100);

const LEAD_STATUSES = ["New Lead", "Contacted", "Survey", "Deal", "Lost"] as const;
const PROJECT_STATUSES = ["Planning", "Design", "Production", "Installation", "Done"] as const;

const leadColors: Record<string, string> = {
  "New Lead": "bg-blue-500",
  Contacted: "bg-yellow-500",
  Survey: "bg-purple-500",
  Deal: "bg-green-500",
  Lost: "bg-red-400",
};
const leadBadge: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Survey: "bg-purple-100 text-purple-700",
  Deal: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};
const projectColors: Record<string, string> = {
  Planning: "bg-gray-400",
  Design: "bg-blue-500",
  Production: "bg-yellow-500",
  Installation: "bg-purple-500",
  Done: "bg-green-500",
};
const projectBadge: Record<string, string> = {
  Planning: "bg-gray-100 text-gray-700",
  Design: "bg-blue-100 text-blue-700",
  Production: "bg-yellow-100 text-yellow-700",
  Installation: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
};
const priorityBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "lead", label: "Pipeline Lead" },
  { key: "proyek", label: "Proyek" },
  { key: "klien", label: "Klien" },
  { key: "finansial", label: "Finansial" },
  { key: "labarugi", label: "Laba Rugi" },
  { key: "pendapatan", label: "Lap. Pendapatan" },
  { key: "pengeluaran", label: "Lap. Pengeluaran" },
];

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};
const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft", sent: "Terkirim", partial: "Sebagian", paid: "Lunas", overdue: "Jatuh Tempo",
};
const invoiceStatusBarColors: Record<string, string> = {
  draft: "bg-gray-400", sent: "bg-blue-500", partial: "bg-yellow-500", paid: "bg-green-500", overdue: "bg-red-500",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({
  label,
  count,
  total,
  colorClass,
  badgeClass,
  valueLabel,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
  badgeClass: string;
  valueLabel?: string;
}) {
  const p = pct(count, total);
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-32 text-center flex-shrink-0 ${badgeClass}`}>
        {label}
      </span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${colorClass} h-2 rounded-full transition-all`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
        {count} <span className="text-gray-400 font-normal">({p}%)</span>
      </span>
      {valueLabel && <span className="text-xs text-gray-500 w-28 text-right flex-shrink-0">{valueLabel}</span>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function ReportsOverview() {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const { invoices, loading: li } = useInvoices();
  const { payments } = useAllPayments();
  const { expenses } = useAllExpenses();
  const [tab, setTab] = useState("ringkasan");

  const loading = lc || ll || lp || li;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  /* ── Computed values ── */
  const totalProjectValue = projects.reduce((s, p) => s + (p.value ?? 0), 0);
  const doneValue = projects.filter((p) => p.status === "Done").reduce((s, p) => s + (p.value ?? 0), 0);
  const activeValue = projects.filter((p) => p.status !== "Done").reduce((s, p) => s + (p.value ?? 0), 0);
  const dealLeads = leads.filter((l) => l.status === "Deal").length;
  const conversionRate = pct(dealLeads, leads.length);
  const avgProgress =
    projects.length === 0 ? 0 : Math.round(projects.reduce((s, p) => s + (p.progress ?? 0), 0) / projects.length);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueProjects = projects.filter((p) => {
    if (!p.deadline || p.status === "Done") return false;
    return new Date(p.deadline) < today;
  });
  const nearDeadline = projects.filter((p) => {
    if (!p.deadline || p.status === "Done") return false;
    const d = new Date(p.deadline);
    const diff = (d.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  /* Lead source breakdown */
  const leadSources = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.source || "Tidak diketahui";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const leadPriorities = leads.reduce<Record<string, number>>((acc, l) => {
    const p = l.priority || "low";
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  /* Client breakdowns */
  const clientByPropertyType = clients.reduce<Record<string, number>>((acc, c) => {
    const k = c.property_type || "Lainnya";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const clientByBudget = clients.reduce<Record<string, number>>((acc, c) => {
    const k = c.budget_range || "Tidak diketahui";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const clientBySource = clients.reduce<Record<string, number>>((acc, c) => {
    const k = c.source || "Tidak diketahui";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const clientByLeadStatus = clients.reduce<Record<string, number>>((acc, c) => {
    const k = c.lead_status || "Tidak ada";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  /* Project value per status */
  const projectValueByStatus = PROJECT_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = projects.filter((p) => p.status === s).reduce((sum, p) => sum + (p.value ?? 0), 0);
    return acc;
  }, {});

  /* Top projects by value */
  const topProjects = [...projects]
    .filter((p) => p.value)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 5);

  /* ── Invoice metrics ── */
  const totalTagihan = invoices.reduce((s, i) => s + i.total_amount, 0);
  const totalTerkumpul = payments.reduce((s, p) => s + p.amount, 0);
  const totalPiutang = totalTagihan - totalTerkumpul;
  const collectionRate = totalTagihan > 0 ? Math.round((totalTerkumpul / totalTagihan) * 100) : 0;

  const overdueInvoices = invoices.filter(
    (i) => i.status !== "paid" && i.due_date && new Date(i.due_date) < today
  );

  const invoiceByStatus = ["draft", "sent", "partial", "paid", "overdue"].reduce<Record<string, number>>((acc, s) => {
    acc[s] = invoices.filter((i) => i.status === s).length;
    return acc;
  }, {});

  /* Monthly invoiced & collected (last 6 months) */
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
  const months = lastNMonths(6);
  const monthlyFinancial = months.map(({ key, label }) => ({
    label,
    Tagihan: invoices
      .filter((i) => monthKey(i.invoice_date || i.created_at) === key)
      .reduce((s, i) => s + i.total_amount, 0),
    Terkumpul: payments
      .filter((p) => monthKey(p.payment_date) === key)
      .reduce((s, p) => s + p.amount, 0),
  }));

  /* Assigned to breakdown */
  const projectByAssignee = projects.reduce<Record<string, number>>((acc, p) => {
    const k = p.assigned_to || "Belum ditugaskan";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Ringkasan ── */}
      {tab === "ringkasan" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Nilai Proyek" value={formatCurrency(totalProjectValue)} sub={`${projects.length} proyek`} />
            <StatCard label="Pendapatan (Selesai)" value={formatCurrency(doneValue)} sub={`${projects.filter((p) => p.status === "Done").length} proyek selesai`} />
            <StatCard label="Nilai Proyek Aktif" value={formatCurrency(activeValue)} sub={`${projects.filter((p) => p.status !== "Done").length} proyek berjalan`} />
            <StatCard label="Konversi Lead → Deal" value={`${conversionRate}%`} sub={`${dealLeads} dari ${leads.length} lead`} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Klien" value={clients.length} sub={`${clients.filter((c) => c.lead_status === "Deal Won").length} deal won`} />
            <StatCard label="Total Lead" value={leads.length} sub={`${leads.filter((l) => l.status === "Lost").length} lost`} />
            <StatCard label="Avg Progress Proyek" value={`${avgProgress}%`} sub="rata-rata semua proyek" />
            <StatCard label="Proyek Overdue" value={overdueProjects.length} sub={`${nearDeadline.length} mepet deadline`} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tagihan" value={formatCurrency(totalTagihan)} sub={`${invoices.length} invoice`} />
            <StatCard label="Terkumpul" value={formatCurrency(totalTerkumpul)} sub={`${collectionRate}% collection rate`} />
            <StatCard label="Piutang" value={formatCurrency(totalPiutang)} sub={`${overdueInvoices.length} invoice jatuh tempo`} />
            <StatCard label="Invoice Lunas" value={invoices.filter((i) => i.status === "paid").length} sub={`dari ${invoices.length} total invoice`} />
          </div>

          {/* Summary table */}
          <SectionCard title="Ringkasan Pipeline">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-3 font-medium">Status Lead</p>
                <div className="space-y-2">
                  {LEAD_STATUSES.map((s) => {
                    const c = leads.filter((l) => l.status === s).length;
                    return (
                      <BarRow
                        key={s}
                        label={s}
                        count={c}
                        total={leads.length}
                        colorClass={leadColors[s]}
                        badgeClass={leadBadge[s]}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-3 font-medium">Status Proyek</p>
                <div className="space-y-2">
                  {PROJECT_STATUSES.map((s) => {
                    const c = projects.filter((p) => p.status === s).length;
                    return (
                      <BarRow
                        key={s}
                        label={s === "Production" ? "Produksi" : s === "Installation" ? "Instalasi" : s === "Done" ? "Selesai" : s}
                        count={c}
                        total={projects.length}
                        colorClass={projectColors[s]}
                        badgeClass={projectBadge[s]}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── TAB: Pipeline Lead ── */}
      {tab === "lead" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {LEAD_STATUSES.map((s) => {
              const c = leads.filter((l) => l.status === s).length;
              return (
                <div key={s} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${leadBadge[s]}`}>{s}</span>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{c}</p>
                  <p className="text-xs text-gray-400">{pct(c, leads.length)}%</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Lead berdasarkan Sumber">
              {Object.keys(leadSources).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data sumber</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(leadSources)
                    .sort((a, b) => b[1] - a[1])
                    .map(([src, cnt]) => (
                      <BarRow
                        key={src}
                        label={src}
                        count={cnt}
                        total={leads.length}
                        colorClass="bg-blue-400"
                        badgeClass="bg-blue-50 text-blue-700"
                      />
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Lead berdasarkan Prioritas">
              {Object.keys(leadPriorities).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data prioritas</p>
              ) : (
                <div className="space-y-2">
                  {(["urgent", "high", "medium", "low"] as const).map((p) => {
                    const cnt = leadPriorities[p] || 0;
                    return (
                      <BarRow
                        key={p}
                        label={p.charAt(0).toUpperCase() + p.slice(1)}
                        count={cnt}
                        total={leads.length}
                        colorClass={
                          p === "urgent"
                            ? "bg-red-500"
                            : p === "high"
                            ? "bg-orange-500"
                            : p === "medium"
                            ? "bg-blue-400"
                            : "bg-gray-400"
                        }
                        badgeClass={priorityBadge[p]}
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Konversi Antar Tahap">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tahap</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Jumlah</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% dari Total</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Drop-off ke berikutnya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {LEAD_STATUSES.filter((s) => s !== "Lost").map((s, i, arr) => {
                    const cnt = leads.filter((l) => l.status === s).length;
                    const nextStatus = arr[i + 1];
                    const nextCnt = nextStatus ? leads.filter((l) => l.status === nextStatus).length : null;
                    const dropoff = nextCnt != null && cnt > 0 ? `${100 - pct(nextCnt, cnt)}%` : "-";
                    return (
                      <tr key={s} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${leadBadge[s]}`}>{s}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{cnt}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-600">{pct(cnt, leads.length)}%</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-500">{dropoff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── TAB: Proyek ── */}
      {tab === "proyek" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Nilai Semua Proyek" value={formatCurrency(totalProjectValue)} sub={`${projects.length} proyek`} />
            <StatCard label="Proyek Overdue" value={overdueProjects.length} sub="deadline terlewat, belum selesai" />
            <StatCard label="Mepet Deadline (≤7 hari)" value={nearDeadline.length} sub="perlu perhatian segera" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Status & Nilai Proyek">
              <div className="space-y-3">
                {PROJECT_STATUSES.map((s) => {
                  const cnt = projects.filter((p) => p.status === s).length;
                  const val = projectValueByStatus[s];
                  const label =
                    s === "Production" ? "Produksi" : s === "Installation" ? "Instalasi" : s === "Done" ? "Selesai" : s;
                  return (
                    <BarRow
                      key={s}
                      label={label}
                      count={cnt}
                      total={projects.length}
                      colorClass={projectColors[s]}
                      badgeClass={projectBadge[s]}
                      valueLabel={val ? formatCurrency(val) : undefined}
                    />
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard title="Project per Penanggung Jawab">
              {Object.keys(projectByAssignee).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(projectByAssignee)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, cnt]) => (
                      <BarRow
                        key={name}
                        label={name}
                        count={cnt}
                        total={projects.length}
                        colorClass="bg-purple-400"
                        badgeClass="bg-purple-50 text-purple-700"
                      />
                    ))}
                </div>
              )}
            </SectionCard>
          </div>

          {overdueProjects.length > 0 && (
            <SectionCard title="Proyek Overdue">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Nama Proyek</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Deadline</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Nilai</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {overdueProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-red-50">
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-900">{p.name}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${projectBadge[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-red-600 font-medium">
                          {p.deadline ? new Date(p.deadline).toLocaleDateString("id-ID") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-700">{formatCurrency(p.value)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-700">{p.progress ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Top 5 Proyek Bernilai Tertinggi">
            {topProjects.length === 0 ? (
              <p className="text-xs text-gray-400">Belum ada proyek dengan nilai</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Nama Proyek</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Nilai</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {topProjects.map((p, i) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 text-xs text-gray-400 font-semibold">{i + 1}</td>
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-900">{p.name}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${projectBadge[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">
                          {formatCurrency(p.value)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-green-500 h-1.5 rounded-full"
                                style={{ width: `${p.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 w-8 text-right">{p.progress ?? 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ── TAB: Klien ── */}
      {tab === "klien" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Klien" value={clients.length} />
            <StatCard
              label="Jenis Properti Terbanyak"
              value={
                Object.entries(clientByPropertyType).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"
              }
              sub="properti paling umum"
            />
            <StatCard
              label="Sumber Terbanyak"
              value={Object.entries(clientBySource).sort((a, b) => b[1] - a[1])[0]?.[0] || "-"}
              sub="saluran akuisisi utama"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Klien berdasarkan Jenis Properti">
              {Object.keys(clientByPropertyType).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(clientByPropertyType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <BarRow
                        key={k}
                        label={k}
                        count={v}
                        total={clients.length}
                        colorClass="bg-blue-400"
                        badgeClass="bg-blue-50 text-blue-700"
                      />
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Klien berdasarkan Budget">
              {Object.keys(clientByBudget).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {(["< 500jt", "500jt - 1M", "> 1M", "Tidak diketahui"] as const).map((k) => {
                    const v = clientByBudget[k] || 0;
                    return (
                      <BarRow
                        key={k}
                        label={k}
                        count={v}
                        total={clients.length}
                        colorClass={k === "> 1M" ? "bg-green-500" : k === "500jt - 1M" ? "bg-yellow-400" : "bg-gray-400"}
                        badgeClass={
                          k === "> 1M"
                            ? "bg-green-50 text-green-700"
                            : k === "500jt - 1M"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-gray-100 text-gray-600"
                        }
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Klien berdasarkan Sumber">
              {Object.keys(clientBySource).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(clientBySource)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <BarRow
                        key={k}
                        label={k}
                        count={v}
                        total={clients.length}
                        colorClass="bg-purple-400"
                        badgeClass="bg-purple-50 text-purple-700"
                      />
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Klien berdasarkan Status Lead">
              {Object.keys(clientByLeadStatus).length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(clientByLeadStatus)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <BarRow
                        key={k}
                        label={k}
                        count={v}
                        total={clients.length}
                        colorClass="bg-orange-400"
                        badgeClass="bg-orange-50 text-orange-700"
                      />
                    ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── TAB: Finansial ── */}
      {tab === "finansial" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tagihan" value={formatCurrency(totalTagihan)} sub={`${invoices.length} invoice`} />
            <StatCard label="Terkumpul" value={formatCurrency(totalTerkumpul)} sub={`${collectionRate}% collection rate`} />
            <StatCard label="Piutang" value={formatCurrency(totalPiutang)} sub="belum terbayar" />
            <StatCard label="Invoice Jatuh Tempo" value={overdueInvoices.length} sub="perlu tindakan" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Invoice berdasarkan Status">
              {invoices.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada invoice</p>
              ) : (
                <div className="space-y-2">
                  {["paid", "partial", "sent", "overdue", "draft"].map((s) => {
                    const cnt = invoiceByStatus[s] ?? 0;
                    const val = invoices.filter((i) => i.status === s).reduce((sum, i) => sum + i.total_amount, 0);
                    return (
                      <BarRow
                        key={s}
                        label={invoiceStatusLabels[s]}
                        count={cnt}
                        total={invoices.length}
                        colorClass={invoiceStatusBarColors[s]}
                        badgeClass={invoiceStatusColors[s]}
                        valueLabel={val > 0 ? formatCurrency(val) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Tren Tagihan vs Terkumpul (6 Bulan)">
              {monthlyFinancial.every((m) => m.Tagihan === 0) ? (
                <p className="text-xs text-gray-400">Belum ada data invoice</p>
              ) : (
                <div className="space-y-3">
                  {monthlyFinancial.map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 w-14">{m.label}</span>
                        <span className="text-gray-400">{formatCurrency(m.Tagihan)}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="bg-blue-400 rounded-full"
                          style={{ width: `${totalTagihan > 0 ? (m.Tagihan / totalTagihan) * 100 : 0}%`, minWidth: m.Tagihan > 0 ? "4px" : "0" }}
                        />
                      </div>
                      <div className="flex gap-1 h-1.5">
                        <div
                          className="bg-green-400 rounded-full"
                          style={{ width: `${totalTagihan > 0 ? (m.Terkumpul / totalTagihan) * 100 : 0}%`, minWidth: m.Terkumpul > 0 ? "4px" : "0" }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Tagihan
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Terkumpul
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>

          {overdueInvoices.length > 0 && (
            <SectionCard title="Invoice Jatuh Tempo">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">No. Invoice</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Project / Client</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Jatuh Tempo</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Total</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Sisa</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {overdueInvoices.map((inv) => {
                      const proj = projects.find((p) => p.id === inv.project_id);
                      const cl = clients.find((c) => c.id === inv.client_id);
                      return (
                      <tr key={inv.id} className="hover:bg-red-50">
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-900">{inv.invoice_number}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-600 hidden sm:table-cell">
                          {proj?.name ?? cl?.name ?? "—"}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-red-600 font-medium">
                          {inv.due_date ? new Date(inv.due_date).toLocaleDateString("id-ID") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-700">{formatCurrency(inv.total_amount)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-red-600">
                          {formatCurrency(inv.total_amount - inv.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/invoices/${inv.id}`} className="text-xs text-blue-600 hover:underline">
                            Detail
                          </Link>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ── TAB: Laba Rugi ── */}
      {tab === "labarugi" && (() => {
        const expenseByProject = expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.project_id] = (acc[e.project_id] ?? 0) + e.jumlah;
          return acc;
        }, {});

        const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
          acc[e.kategori] = (acc[e.kategori] ?? 0) + e.jumlah;
          return acc;
        }, {});

        const paidByProject = invoices.reduce<Record<string, number>>((acc, inv) => {
          if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.paid_amount;
          return acc;
        }, {});

        const billedByProject = invoices.reduce<Record<string, number>>((acc, inv) => {
          if (inv.project_id) acc[inv.project_id] = (acc[inv.project_id] ?? 0) + inv.total_amount;
          return acc;
        }, {});

        const rows = projects
          .filter((p) => (expenseByProject[p.id] ?? 0) > 0 || (paidByProject[p.id] ?? 0) > 0)
          .map((p) => {
            const nilai = p.value ?? 0;
            const tagihan = billedByProject[p.id] ?? 0;
            const terkumpul = paidByProject[p.id] ?? 0;
            const pengeluaran = expenseByProject[p.id] ?? 0;
            const laba = terkumpul - pengeluaran;
            const margin = terkumpul > 0 ? Math.round((laba / terkumpul) * 100) : null;
            return { p, nilai, tagihan, terkumpul, pengeluaran, laba, margin };
          })
          .sort((a, b) => b.laba - a.laba);

        const totalNilai = rows.reduce((s, r) => s + r.nilai, 0);
        const totalTerkumpul = rows.reduce((s, r) => s + r.terkumpul, 0);
        const totalPengeluaran = rows.reduce((s, r) => s + r.pengeluaran, 0);
        const totalLaba = totalTerkumpul - totalPengeluaran;
        const totalMargin = totalTerkumpul > 0 ? Math.round((totalLaba / totalTerkumpul) * 100) : 0;

        const KATEGORI_LABELS: Record<string, string> = {
          material: "Material", jasa: "Jasa", transport: "Transport", lainnya: "Lainnya",
        };

        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Terkumpul" value={formatCurrency(totalTerkumpul)} sub={`dari ${formatCurrency(totalNilai)} nilai kontrak`} />
              <StatCard label="Total Pengeluaran" value={formatCurrency(totalPengeluaran)} sub={`${rows.length} project`} />
              <StatCard
                label="Laba Bersih"
                value={formatCurrency(totalLaba)}
                sub={`margin ${totalMargin}%`}
              />
              <StatCard label="Project Merugi" value={rows.filter((r) => r.laba < 0).length} sub="perlu perhatian" />
            </div>

            {/* Breakdown pengeluaran per kategori */}
            {expenses.length > 0 && (
              <SectionCard title="Pengeluaran per Kategori">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(["material", "jasa", "transport", "lainnya"] as const).map((k) => {
                    const jumlah = expenseByCategory[k] ?? 0;
                    const pct = totalPengeluaran > 0 ? Math.round((jumlah / totalPengeluaran) * 100) : 0;
                    return (
                      <div key={k} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-0.5">{KATEGORI_LABELS[k]}</p>
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(jumlah)}</p>
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{pct}% dari total</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Tabel per project */}
            <SectionCard title="Laba Rugi per Project">
              {rows.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada data pengeluaran atau pembayaran yang terhubung ke project.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500">Project</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Status</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Terkumpul</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Pengeluaran</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500">Laba</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.map(({ p, terkumpul, pengeluaran, laba, margin }) => {
                        const cl = clients.find((c) => c.id === p.client_id);
                        const isRugi = laba < 0;
                        return (
                          <tr key={p.id} className={`hover:bg-gray-50 ${isRugi ? "bg-red-50/40" : ""}`}>
                            <td className="py-2.5 px-3">
                              <p className="text-xs font-medium text-gray-900">{p.name}</p>
                              {cl && <p className="text-xs text-gray-400">{cl.name}</p>}
                            </td>
                            <td className="py-2.5 px-3 hidden sm:table-cell">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${projectBadge[p.status] ?? "bg-gray-100 text-gray-600"}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs text-gray-700">{formatCurrency(terkumpul)}</td>
                            <td className="py-2.5 px-3 text-right text-xs text-orange-600">{formatCurrency(pengeluaran)}</td>
                            <td className={`py-2.5 px-3 text-right text-xs font-semibold ${isRugi ? "text-red-600" : "text-green-600"}`}>
                              {formatCurrency(laba)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs hidden md:table-cell">
                              {margin !== null ? (
                                <span className={`font-semibold ${margin < 0 ? "text-red-600" : margin < 20 ? "text-yellow-600" : "text-green-600"}`}>
                                  {margin}%
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td className="py-2.5 px-3 text-xs font-bold text-gray-900" colSpan={2}>Total</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{formatCurrency(totalTerkumpul)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-orange-600">{formatCurrency(totalPengeluaran)}</td>
                        <td className={`py-2.5 px-3 text-right text-xs font-bold ${totalLaba < 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(totalLaba)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold hidden md:table-cell">
                          <span className={totalMargin < 0 ? "text-red-600" : totalMargin < 20 ? "text-yellow-600" : "text-green-600"}>
                            {totalMargin}%
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>
        );
      })()}

      {/* ── TAB: Laporan Pendapatan ── */}
      {tab === "pendapatan" && (
        <LaporanPendapatan
          payments={payments}
          invoices={invoices}
          projects={projects}
          clients={clients}
        />
      )}

      {/* ── TAB: Laporan Pengeluaran ── */}
      {tab === "pengeluaran" && (
        <LaporanPengeluaran
          expenses={expenses}
          projects={projects}
          clients={clients}
        />
      )}
    </div>
  );
}
