// Perhitungan Dashboard V2 (laporan manajerial). Murni: tidak fetch, tidak
// baca jam sistem — `today` selalu dioper dari luar supaya bisa dites.

import type {
  ExpenseCategory, GeneralExpense, GeneralExpenseKategori, Invoice, Lead, Payment, Project, ProjectExpense,
} from "@/types/db";
import { getProjectValue } from "@/utils/projectValue";

export type PeriodKind = "30d" | "quarter" | "year" | "custom";
export interface Period { from: string; to: string } // YYYY-MM-DD, inklusif

const DAY = 86_400_000;
const day = (s?: string) => (s ? s.slice(0, 10) : "");
const toTime = (s: string) => Date.parse(`${s}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((toTime(b) - toTime(a)) / DAY);
const inRange = (d: string | undefined, p: Period) => !!d && day(d) >= p.from && day(d) <= p.to;

export function periodFor(kind: Exclude<PeriodKind, "custom">, today: string): Period {
  const [y, m] = today.split("-").map(Number);
  if (kind === "30d") return { from: iso(toTime(today) - 29 * DAY), to: today };
  if (kind === "quarter") {
    const qStart = Math.floor((m - 1) / 3) * 3 + 1;
    return { from: `${y}-${String(qStart).padStart(2, "0")}-01`, to: today };
  }
  return { from: `${y}-01-01`, to: today };
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Bulan yang ditampilkan di grafik tren: seluruh periode, minimal 6 bulan ke belakang dari akhir periode. */
export function chartMonths(p: Period, minMonths = 6): { key: string; label: string }[] {
  const [ty, tm] = p.to.split("-").map(Number);
  const [fy, fm] = p.from.split("-").map(Number);
  const count = Math.max(minMonths, (ty - fy) * 12 + (tm - fm) + 1);
  return Array.from({ length: count }, (_, i) => {
    const idx = ty * 12 + (tm - 1) - (count - 1 - i);
    const yy = Math.floor(idx / 12), mm = idx % 12;
    return { key: `${yy}-${String(mm + 1).padStart(2, "0")}`, label: MONTH_LABELS[mm] };
  });
}

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = { material: "Material", jasa: "Jasa", transport: "Transport", lainnya: "Lain proyek" };
export const GENERAL_LABELS: Record<GeneralExpenseKategori, string> = { gaji: "Gaji", operasional: "Operasional", marketing: "Marketing", lainnya: "Lainnya" };

export interface DashboardInput {
  leads: Lead[];
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  projectExpenses: ProjectExpense[];
  generalExpenses: GeneralExpense[];
  rabTotals: Record<string, number>;
  clientNames: Record<string, string>;
}

export interface ProjectHealth {
  id: string; name: string; client: string; value: number; billed: number; paid: number; cost: number;
  progress: number; timePct: number | null; daysLate: number; costPct: number;
}

export interface ActionItem { tone: "danger" | "warning" | "active"; title: string; detail: string; href: string; weight: number }

export function buildDashboard(input: DashboardInput, period: Period, today: string) {
  const { leads, projects, invoices, payments, projectExpenses, generalExpenses, rabTotals, clientNames } = input;

  // ── Uang dalam periode ──
  const kasMasuk = payments.filter((p) => inRange(p.payment_date, period)).reduce((s, p) => s + p.amount, 0);
  const projCost = {} as Record<ExpenseCategory, number>;
  for (const e of projectExpenses) if (inRange(e.tanggal, period)) projCost[e.kategori] = (projCost[e.kategori] ?? 0) + e.jumlah;
  const genCost = {} as Record<GeneralExpenseKategori, number>;
  for (const e of generalExpenses) if (inRange(e.tanggal, period)) genCost[e.kategori] = (genCost[e.kategori] ?? 0) + e.jumlah;
  const biayaProyek = Object.values(projCost).reduce((s, v) => s + v, 0);
  const biayaUmum = Object.values(genCost).reduce((s, v) => s + v, 0);
  const pengeluaran = biayaProyek + biayaUmum;
  const labaKotor = kasMasuk - biayaProyek;
  const labaBersih = kasMasuk - pengeluaran;

  // ── Tren bulanan ──
  const months = chartMonths(period).map((m) => ({ ...m, masuk: 0, keluar: 0 }));
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) { const m = byKey.get(day(p.payment_date).slice(0, 7)); if (m) m.masuk += p.amount; }
  for (const e of [...projectExpenses, ...generalExpenses]) { const m = byKey.get(day(e.tanggal).slice(0, 7)); if (m) m.keluar += e.jumlah; }

  // ── Piutang per umur (posisi hari ini) ──
  const aging = [
    { label: "Belum jatuh tempo", amount: 0 }, { label: "1–30 hari", amount: 0 }, { label: "31–60 hari", amount: 0 },
    { label: "61–90 hari", amount: 0 }, { label: "> 90 hari", amount: 0 },
  ];
  const openInvoices = invoices.filter((i) => i.status !== "paid" && i.total_amount - i.paid_amount > 0);
  for (const inv of openInvoices) {
    const late = inv.due_date ? daysBetween(day(inv.due_date), today) : 0;
    const idx = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4;
    aging[idx].amount += inv.total_amount - inv.paid_amount;
  }
  const piutang = aging.reduce((s, b) => s + b.amount, 0);
  const piutangLewat = piutang - aging[0].amount;

  // ── Kesehatan proyek berjalan ──
  const health: ProjectHealth[] = projects
    .filter((p) => p.status !== "Done")
    .map((p) => {
      const value = getProjectValue(p, rabTotals);
      const inv = invoices.filter((i) => i.project_id === p.id);
      const cost = projectExpenses.filter((e) => e.project_id === p.id).reduce((s, e) => s + e.jumlah, 0);
      const start = day(p.start_date), end = day(p.deadline);
      const duration = start && end ? daysBetween(start, end) : 0;
      const timePct = duration > 0 ? Math.max(0, (daysBetween(start, today) / duration) * 100) : null;
      return {
        id: p.id, name: p.name, client: clientNames[p.client_id ?? ""] ?? "",
        value, billed: inv.reduce((s, i) => s + i.total_amount, 0), paid: inv.reduce((s, i) => s + i.paid_amount, 0), cost,
        progress: p.progress ?? 0, timePct, daysLate: end ? Math.max(0, daysBetween(end, today)) : 0,
        costPct: value > 0 ? (cost / value) * 100 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
  const kontrakBerjalan = health.reduce((s, h) => s + h.value, 0);
  const belumDitagih = health.reduce((s, h) => s + Math.max(0, h.value - h.billed), 0);

  // ── Penjualan ──
  const STAGES = ["New Lead", "Contacted", "Survey", "Deal"] as const;
  const funnel = STAGES.map((s) => ({ stage: s, count: leads.filter((l) => l.status === s).length }));
  const closed = leads.filter((l) => (l.status === "Deal Won" || l.status === "Deal Lost") && inRange(l.closed_at, period));
  const won = closed.filter((l) => l.status === "Deal Won");
  const winRate = closed.length > 0 ? (won.length / closed.length) * 100 : null;
  const closeDays = won.filter((l) => l.created_at && l.closed_at).map((l) => daysBetween(day(l.created_at), day(l.closed_at)));
  const avgCloseDays = closeDays.length > 0 ? closeDays.reduce((s, d) => s + d, 0) / closeDays.length : null;
  const nilaiDeal = won.reduce((s, l) => s + (l.nominal_deal ?? 0), 0);
  const sourceMap = new Map<string, { source: string; won: number; open: number; lost: number }>();
  for (const l of leads.filter((l) => inRange(l.created_at, period))) {
    const key = l.source || "Tanpa sumber";
    const row = sourceMap.get(key) ?? { source: key, won: 0, open: 0, lost: 0 };
    if (l.status === "Deal Won") row.won++; else if (l.status === "Deal Lost") row.lost++; else row.open++;
    sourceMap.set(key, row);
  }
  const sources = [...sourceMap.values()].sort((a, b) => b.won - a.won || (b.won + b.open + b.lost) - (a.won + a.open + a.lost));
  const marketing = genCost.marketing ?? 0;

  // ── Perlu tindakan (posisi hari ini, diurutkan menurut dampak uang) ──
  const actions: ActionItem[] = [];
  const debtorMap = new Map<string, { client: string; amount: number; count: number }>();
  for (const inv of openInvoices) {
    if (!inv.due_date) continue;
    const late = daysBetween(day(inv.due_date), today);
    if (late <= 0) continue;
    const sisa = inv.total_amount - inv.paid_amount;
    const proj = projects.find((p) => p.id === inv.project_id);
    const client = clientNames[inv.client_id ?? proj?.client_id ?? ""] ?? "";
    actions.push({
      tone: "danger", weight: sisa,
      title: `Tagih ${inv.paid_amount > 0 ? "sisa " : ""}${shortIDR(sisa)}${client ? `, ${client}` : ""}`,
      detail: `${inv.invoice_number} · lewat ${late} hari${proj ? ` · ${proj.name}` : ""}`,
      href: `/invoices/${inv.id}`,
    });
    const debtor = debtorMap.get(client) ?? { client: client || "Tanpa klien", amount: 0, count: 0 };
    debtor.amount += sisa; debtor.count++;
    debtorMap.set(client, debtor);
  }
  const debtors = [...debtorMap.values()].sort((a, b) => b.amount - a.amount);
  for (const h of health) {
    if (h.cost > 0 && h.costPct - h.progress >= 30) {
      actions.push({ tone: "danger", weight: h.cost, title: `${h.name}: biaya ${Math.round(h.costPct)}% kontrak, progres ${h.progress}%`, detail: "Biaya berjalan lebih cepat dari pekerjaan", href: `/projects/${h.id}` });
    }
    if (h.value > 0 && h.billed > h.value * 1.01) {
      actions.push({ tone: "warning", weight: h.billed - h.value, title: `${h.name}: tagihan ${Math.round((h.billed / h.value) * 100)}% dari nilai kontrak`, detail: "Kemungkinan salah input invoice atau RAB", href: `/projects/${h.id}` });
    }
  }
  const lateProjects = health.filter((h) => h.daysLate > 0);
  if (lateProjects.length > 0) {
    actions.push({ tone: "warning", weight: 0, title: `${lateProjects.length} proyek lewat tenggat`, detail: lateProjects.slice(0, 3).map((h) => `${h.name} (${h.daysLate} hari)`).join(", "), href: "/projects" });
  }
  const lateFollowUps = leads.filter((l) => l.status !== "Deal Won" && l.status !== "Deal Lost" && l.follow_up_date && day(l.follow_up_date) < today);
  if (lateFollowUps.length > 0) {
    const oldest = Math.max(...lateFollowUps.map((l) => daysBetween(day(l.follow_up_date), today)));
    actions.push({ tone: "active", weight: -1, title: `${lateFollowUps.length} lead terlewat jadwal follow-up`, detail: `Paling lama ${oldest} hari`, href: "/leads" });
  }
  actions.sort((a, b) => b.weight - a.weight);

  return {
    period, kasMasuk, pengeluaran, biayaProyek, biayaUmum, labaKotor, labaBersih,
    projCost, genCost, months, aging, piutang, piutangLewat, debtors,
    health, kontrakBerjalan, belumDitagih, lateProjects: lateProjects.length,
    funnel, winRate, avgCloseDays, nilaiDeal, wonCount: won.length, closedCount: closed.length, sources, marketing,
    actions,
  };
}

export type DashboardData = ReturnType<typeof buildDashboard>;

/** "40 jt", "312,5 jt", "1,2 M", "850 rb" — untuk label grafik dan judul. */
export function shortIDR(v: number): string {
  const a = Math.abs(v), sign = v < 0 ? "−" : "";
  const f = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  if (a >= 1e9) return `${sign}Rp${f(a / 1e9)} M`;
  if (a >= 1e6) return `${sign}Rp${f(a / 1e6)} jt`;
  if (a >= 1e3) return `${sign}Rp${f(a / 1e3)} rb`;
  return `${sign}Rp${f(a)}`;
}
