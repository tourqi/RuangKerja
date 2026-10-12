"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useAllPayments } from "@/hooks/usePayments";
import { useAllExpenses } from "@/hooks/useExpenses";
import { useApprovedRabTotals } from "@/hooks/useRab";
import { useState } from "react";
import { DetailTabs } from "@/components/DetailTabs";
import Link from "next/link";
import { LaporanPendapatan } from "./LaporanPendapatan";
import { LaporanPengeluaran } from "./LaporanPengeluaran";
import { LaporanArusKas } from "./LaporanArusKas";
import { computeProjectProfitLoss } from "@/utils/profitLossCalculations";
import { groupSumByKey } from "@/utils/reportCalculations";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import { formatIDR, formatDate } from "@/utils/format";

const formatCurrency = (v?: number) =>
  v == null
    ? "Rp 0"
    : formatIDR(v);

const pct = (part: number, total: number) =>
  total === 0 ? 0 : Math.round((part / total) * 100);

const LEAD_STATUSES = ["New Lead", "Contacted", "Survey", "Deal", "Deal Won", "Deal Lost"] as const;
const PROJECT_STATUSES = ["Planning", "Design", "Production", "Installation", "Done"] as const;

const leadColors: Record<string, string> = {
  "New Lead": "bg-accent",
  Contacted: "bg-warning",
  Survey: "bg-accent",
  Deal: "bg-accent",
  "Deal Won": "bg-success",
  "Deal Lost": "bg-danger",
};
const leadBadge: Record<string, string> = {
  "New Lead": "tone-active",
  Contacted: "tone-warning",
  Survey: "tone-active",
  Deal: "tone-active",
  "Deal Won": "tone-success",
  "Deal Lost": "tone-danger",
};
const projectColors: Record<string, string> = {
  Planning: "bg-faint",
  Design: "bg-accent",
  Production: "bg-warning",
  Installation: "bg-accent",
  Done: "bg-success",
};
const projectBadge: Record<string, string> = {
  Planning: "tone-neutral",
  Design: "tone-active",
  Production: "tone-warning",
  Installation: "tone-active",
  Done: "tone-success",
};
const priorityBadge: Record<string, string> = {
  low: "tone-neutral",
  medium: "tone-active",
  high: "tone-warning",
  urgent: "tone-danger",
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
  { key: "aruskas", label: "Arus Kas" },
];

const invoiceStatusColors: Record<string, string> = {
  draft: "tone-neutral",
  sent: "tone-active",
  partial: "tone-warning",
  paid: "tone-success",
  overdue: "tone-danger",
};
const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft", sent: "Terkirim", partial: "Sebagian", paid: "Lunas", overdue: "Jatuh Tempo",
};
const invoiceStatusBarColors: Record<string, string> = {
  draft: "bg-faint", sent: "bg-accent", partial: "bg-warning", paid: "bg-success", overdue: "bg-danger",
};

/** Satu sel angka di dalam StatStrip. */
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white px-4 py-3 flex-1 min-w-[160px]">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-lg font-medium text-ink mt-0.5 truncate">{value}</p>
      {sub && <p className="text-[11.5px] text-faint mt-0.5">{sub}</p>}
    </div>
  );
}

/** Deretan angka dalam satu strip bergaris tipis (pengganti grid kartu identik). */
function StatStrip({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      {title && <h3 className="text-xs font-medium text-muted">{title}</h3>}
      <div className="flex flex-wrap gap-px bg-line border border-line rounded-md overflow-hidden">{children}</div>
    </section>
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
      <div className="flex-1 bg-hover rounded-full h-2">
        <div className={`${colorClass} h-2 rounded-full transition-all`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs font-semibold text-ink w-16 text-right flex-shrink-0">
        {count} <span className="text-faint font-normal">({p}%)</span>
      </span>
      {valueLabel && <span className="text-xs text-muted w-28 text-right flex-shrink-0">{valueLabel}</span>}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-md border border-line p-5">
      <h3 className="text-sm font-semibold text-ink mb-4">{title}</h3>
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
  const { totals: rabTotals } = useApprovedRabTotals();
  const [tab, setTab] = useState("ringkasan");

  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);

  const loading = lc || ll || lp || li;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-line border-t-ink" />
      </div>
    );
  }

  /* ── Computed values ── */
  const totalProjectValue = projects.reduce((s, p) => s + getProjectValue(p), 0);
  const doneValue = projects.filter((p) => p.status === "Done").reduce((s, p) => s + getProjectValue(p), 0);
  const activeValue = projects.filter((p) => p.status !== "Done").reduce((s, p) => s + getProjectValue(p), 0);
  const dealLeads = leads.filter((l) => l.status === "Deal Won").length;
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
    acc[s] = projects.filter((p) => p.status === s).reduce((sum, p) => sum + getProjectValue(p), 0);
    return acc;
  }, {});

  /* Top projects by value */
  const topProjects = [...projects]
    .filter((p) => getProjectValue(p) > 0)
    .sort((a, b) => getProjectValue(b) - getProjectValue(a))
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
      <DetailTabs tabs={[...TABS]} active={tab} onChange={setTab} />

      {/* ── TAB: Ringkasan ── */}
      {tab === "ringkasan" && (
        <div className="space-y-4">
          <StatStrip title="Proyek">
            <StatCard label="Total nilai proyek" value={formatCurrency(totalProjectValue)} sub={`${projects.length} proyek`} />
            <StatCard label="Nilai proyek aktif" value={formatCurrency(activeValue)} sub={`${projects.filter((p) => p.status !== "Done").length} proyek berjalan`} />
            <StatCard label="Pendapatan (selesai)" value={formatCurrency(doneValue)} sub={`${projects.filter((p) => p.status === "Done").length} proyek selesai`} />
            <StatCard label="Rata-rata progres" value={`${avgProgress}%`} sub="semua proyek" />
            <StatCard label="Lewat tenggat" value={overdueProjects.length} sub={`${nearDeadline.length} tenggat ≤ 7 hari`} />
          </StatStrip>

          <StatStrip title="Penjualan">
            <StatCard label="Total klien" value={clients.length} sub={`${clients.filter((c) => c.lead_status === "Deal Won").length} deal won`} />
            <StatCard label="Total lead" value={leads.length} sub={`${leads.filter((l) => l.status === "Deal Lost").length} lost`} />
            <StatCard label="Konversi lead → deal" value={`${conversionRate}%`} sub={`${dealLeads} dari ${leads.length} lead`} />
          </StatStrip>

          <StatStrip title="Keuangan">
            <StatCard label="Total tagihan" value={formatCurrency(totalTagihan)} sub={`${invoices.length} invoice`} />
            <StatCard label="Terkumpul" value={formatCurrency(totalTerkumpul)} sub={`${collectionRate}% tingkat penagihan`} />
            <StatCard label="Piutang" value={formatCurrency(totalPiutang)} sub={`${overdueInvoices.length} invoice jatuh tempo`} />
            <StatCard label="Invoice lunas" value={invoices.filter((i) => i.status === "paid").length} sub={`dari ${invoices.length} invoice`} />
          </StatStrip>

          {/* Summary table */}
          <SectionCard title="Ringkasan Pipeline">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted mb-3 font-medium">Status Lead</p>
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
                <p className="text-xs text-muted mb-3 font-medium">Status Proyek</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            {LEAD_STATUSES.map((s) => {
              const c = leads.filter((l) => l.status === s).length;
              return (
                <div key={s} className="bg-white rounded-md border border-line p-4 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${leadBadge[s]}`}>{s}</span>
                  <p className="text-3xl font-semibold text-ink mt-2">{c}</p>
                  <p className="text-xs text-faint">{pct(c, leads.length)}%</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Lead berdasarkan Sumber">
              {Object.keys(leadSources).length === 0 ? (
                <p className="text-xs text-faint">Belum ada data sumber</p>
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
                        colorClass="bg-accent"
                        badgeClass="bg-accent-soft text-accent"
                      />
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Lead berdasarkan Prioritas">
              {Object.keys(leadPriorities).length === 0 ? (
                <p className="text-xs text-faint">Belum ada data prioritas</p>
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
                            ? "bg-danger"
                            : p === "high"
                            ? "bg-warning"
                            : p === "medium"
                            ? "bg-accent"
                            : "bg-faint"
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
                  <tr className="border-b border-line">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Tahap</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Jumlah</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted">% dari Total</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Drop-off ke berikutnya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {LEAD_STATUSES.filter((s) => s !== "Deal Lost").map((s, i, arr) => {
                    const cnt = leads.filter((l) => l.status === s).length;
                    const nextStatus = arr[i + 1];
                    const nextCnt = nextStatus ? leads.filter((l) => l.status === nextStatus).length : null;
                    const dropoff = nextCnt != null && cnt > 0 ? `${100 - pct(nextCnt, cnt)}%` : "—";
                    return (
                      <tr key={s} className="hover:bg-hover">
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${leadBadge[s]}`}>{s}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-ink">{cnt}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-muted">{pct(cnt, leads.length)}%</td>
                        <td className="py-2.5 px-3 text-right text-xs text-muted">{dropoff}</td>
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
          <div className="flex flex-wrap gap-px bg-line border border-line rounded-md overflow-hidden">
            <StatCard label="Total Nilai Semua Proyek" value={formatCurrency(totalProjectValue)} sub={`${projects.length} proyek`} />
            <StatCard label="Lewat tenggat" value={overdueProjects.length} sub="belum selesai" />
            <StatCard label="Tenggat ≤ 7 hari" value={nearDeadline.length} sub="perlu perhatian segera" />
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
                <p className="text-xs text-faint">Belum ada data</p>
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
                        colorClass="bg-accent"
                        badgeClass="bg-accent-soft text-accent"
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
                    <tr className="border-b border-line">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Nama Proyek</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Tenggat</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Nilai</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Progres</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {overdueProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-danger-soft">
                        <td className="py-2.5 px-3 text-xs font-medium text-ink">{p.name}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${projectBadge[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-danger font-medium whitespace-nowrap">
                          {p.deadline ? formatDate(p.deadline) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-ink">{formatCurrency(p.value)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-ink">{p.progress ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <SectionCard title="Top 5 Proyek Bernilai Tertinggi">
            {topProjects.length === 0 ? (
              <p className="text-xs text-faint">Belum ada proyek dengan nilai</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">#</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Nama Proyek</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Status</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Nilai</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Progres</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {topProjects.map((p, i) => (
                      <tr key={p.id} className="hover:bg-hover">
                        <td className="py-2.5 px-3 text-xs text-faint font-semibold">{i + 1}</td>
                        <td className="py-2.5 px-3 text-xs font-medium text-ink">{p.name}</td>
                        <td className="py-2.5 px-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${projectBadge[p.status]}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-ink">
                          {formatCurrency(p.value)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-hover rounded-full h-1.5">
                              <div
                                className="bg-success h-1.5 rounded-full"
                                style={{ width: `${p.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted w-8 text-right">{p.progress ?? 0}%</span>
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
          <div className="flex flex-wrap gap-px bg-line border border-line rounded-md overflow-hidden">
            <StatCard label="Total Klien" value={clients.length} />
            <StatCard
              label="Jenis Properti Terbanyak"
              value={
                Object.entries(clientByPropertyType).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
              }
              sub="properti paling umum"
            />
            <StatCard
              label="Sumber Terbanyak"
              value={Object.entries(clientBySource).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}
              sub="saluran akuisisi utama"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Klien berdasarkan Jenis Properti">
              {Object.keys(clientByPropertyType).length === 0 ? (
                <p className="text-xs text-faint">Belum ada data</p>
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
                        colorClass="bg-accent"
                        badgeClass="bg-accent-soft text-accent"
                      />
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Klien berdasarkan Budget">
              {Object.keys(clientByBudget).length === 0 ? (
                <p className="text-xs text-faint">Belum ada data</p>
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
                        colorClass={k === "> 1M" ? "bg-success" : k === "500jt - 1M" ? "bg-warning" : "bg-faint"}
                        badgeClass={
                          k === "> 1M"
                            ? "bg-success-soft text-success"
                            : k === "500jt - 1M"
                            ? "bg-warning-soft text-warning"
                            : "tone-neutral"
                        }
                      />
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Klien berdasarkan Sumber">
              {Object.keys(clientBySource).length === 0 ? (
                <p className="text-xs text-faint">Belum ada data</p>
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
                        colorClass="bg-accent"
                        badgeClass="bg-accent-soft text-accent"
                      />
                    ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Klien berdasarkan Status Lead">
              {Object.keys(clientByLeadStatus).length === 0 ? (
                <p className="text-xs text-faint">Belum ada data</p>
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
                        colorClass="bg-warning"
                        badgeClass="bg-warning-soft text-warning"
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
          <div className="flex flex-wrap gap-px bg-line border border-line rounded-md overflow-hidden">
            <StatCard label="Total Tagihan" value={formatCurrency(totalTagihan)} sub={`${invoices.length} invoice`} />
            <StatCard label="Terkumpul" value={formatCurrency(totalTerkumpul)} sub={`${collectionRate}% tingkat penagihan`} />
            <StatCard label="Piutang" value={formatCurrency(totalPiutang)} sub="belum terbayar" />
            <StatCard label="Invoice Jatuh Tempo" value={overdueInvoices.length} sub="perlu tindakan" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Invoice berdasarkan Status">
              {invoices.length === 0 ? (
                <p className="text-xs text-faint">Belum ada invoice</p>
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
                <p className="text-xs text-faint">Belum ada data invoice</p>
              ) : (
                <div className="space-y-3">
                  {monthlyFinancial.map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted w-14">{m.label}</span>
                        <span className="text-faint">{formatCurrency(m.Tagihan)}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="bg-accent rounded-full"
                          style={{ width: `${totalTagihan > 0 ? (m.Tagihan / totalTagihan) * 100 : 0}%`, minWidth: m.Tagihan > 0 ? "4px" : "0" }}
                        />
                      </div>
                      <div className="flex gap-1 h-1.5">
                        <div
                          className="bg-success rounded-full"
                          style={{ width: `${totalTagihan > 0 ? (m.Terkumpul / totalTagihan) * 100 : 0}%`, minWidth: m.Terkumpul > 0 ? "4px" : "0" }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Tagihan
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2.5 h-2.5 rounded-full bg-success" /> Terkumpul
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
                    <tr className="border-b border-line">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">No. Invoice</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted hidden sm:table-cell">Project / Client</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted">Jatuh Tempo</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Total</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-muted">Sisa</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {overdueInvoices.map((inv) => {
                      const proj = projects.find((p) => p.id === inv.project_id);
                      const cl = clients.find((c) => c.id === inv.client_id);
                      return (
                      <tr key={inv.id} className="hover:bg-danger-soft">
                        <td className="py-2.5 px-3 text-xs font-medium text-ink">{inv.invoice_number}</td>
                        <td className="py-2.5 px-3 text-xs text-muted hidden sm:table-cell">
                          {proj?.name ?? cl?.name ?? "—"}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-danger font-medium whitespace-nowrap">
                          {inv.due_date ? formatDate(inv.due_date) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-ink">{formatCurrency(inv.total_amount)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-danger">
                          {formatCurrency(inv.total_amount - inv.paid_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link href={`/invoices/${inv.id}`} className="text-xs text-accent hover:underline">
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
        const expenseByCategory = groupSumByKey(expenses, (e) => e.kategori, (e) => e.jumlah);

        const { rows, totals } = computeProjectProfitLoss(projects, expenses, invoices, getProjectValue);
        const { totalNilai, totalTerkumpul, totalPengeluaran, totalLaba, totalMargin } = totals;

        const KATEGORI_LABELS: Record<string, string> = {
          material: "Material", jasa: "Jasa", transport: "Transport", lainnya: "Lainnya",
        };

        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="flex flex-wrap gap-px bg-line border border-line rounded-md overflow-hidden">
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
                      <div key={k} className="bg-surface rounded-md p-3">
                        <p className="text-xs text-muted mb-0.5">{KATEGORI_LABELS[k]}</p>
                        <p className="text-sm font-semibold text-ink">{formatCurrency(jumlah)}</p>
                        <div className="mt-2 h-1.5 bg-line rounded-full overflow-hidden">
                          <div className="h-full bg-warning rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-faint mt-1">{pct}% dari total</p>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* Tabel per project */}
            <SectionCard title="Laba Rugi per Project">
              {rows.length === 0 ? (
                <p className="text-xs text-faint">Belum ada data pengeluaran atau pembayaran yang terhubung ke project.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted">Project</th>
                        <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted hidden sm:table-cell">Status</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted">Terkumpul</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted">Pengeluaran</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted">Laba</th>
                        <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted hidden md:table-cell">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map(({ project: p, terkumpul, pengeluaran, laba, margin }) => {
                        const cl = clients.find((c) => c.id === p.client_id);
                        const isRugi = laba < 0;
                        return (
                          <tr key={p.id} className={`hover:bg-hover ${isRugi ? "bg-danger-soft/40" : ""}`}>
                            <td className="py-2.5 px-3">
                              <p className="text-xs font-medium text-ink">{p.name}</p>
                              {cl && <p className="text-xs text-faint">{cl.name}</p>}
                            </td>
                            <td className="py-2.5 px-3 hidden sm:table-cell">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${projectBadge[p.status] ?? "tone-neutral"}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs text-ink">{formatCurrency(terkumpul)}</td>
                            <td className="py-2.5 px-3 text-right text-xs text-warning">{formatCurrency(pengeluaran)}</td>
                            <td className={`py-2.5 px-3 text-right text-xs font-semibold ${isRugi ? "text-danger" : "text-success"}`}>
                              {formatCurrency(laba)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-xs hidden md:table-cell">
                              {margin !== null ? (
                                <span className={`font-semibold ${margin < 0 ? "text-danger" : margin < 20 ? "text-warning" : "text-success"}`}>
                                  {margin}%
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-line bg-surface">
                        <td className="py-2.5 px-3 text-xs font-semibold text-ink" colSpan={2}>Total</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-ink">{formatCurrency(totalTerkumpul)}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-warning">{formatCurrency(totalPengeluaran)}</td>
                        <td className={`py-2.5 px-3 text-right text-xs font-semibold ${totalLaba < 0 ? "text-danger" : "text-success"}`}>
                          {formatCurrency(totalLaba)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold hidden md:table-cell">
                          <span className={totalMargin < 0 ? "text-danger" : totalMargin < 20 ? "text-warning" : "text-success"}>
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

      {/* ── TAB: Laporan Arus Kas ── */}
      {tab === "aruskas" && (
        <LaporanArusKas
          payments={payments}
          expenses={expenses}
          invoices={invoices}
          projects={projects}
          clients={clients}
        />
      )}
    </div>
  );
}
