// Perhitungan menu Marketing. Murni: tidak fetch, tidak baca jam sistem.

import type { Invoice, Lead, MarketingKpiMonthly, Payment, Project, Rab } from "@/types/db";
import { LOST_REASONS, MARKETING_TARGETS, REFERRAL_ASK, SOURCES } from "@/constants/options";
import { localToday } from "@/utils/warranty";

const AD_SOURCE = "Iklan Meta";

/** Bulan YYYY-MM. Timestamp dikonversi ke zona lokal supaya lead tengah malam masuk bulan yang benar. */
export function monthOf(value?: string | null): string | null {
  if (!value) return null;
  return (value.length > 10 ? localToday(new Date(value)) : value).slice(0, 7);
}

/** `count` bulan terakhir termasuk bulan ini, terbaru lebih dulu. */
export function recentMonths(today: string, count: number): string[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - i, 1));
    return date.toISOString().slice(0, 7);
  });
}

export function isAskLead(lead: Pick<Lead, "referred_by">): boolean {
  return lead.referred_by?.trim().toLowerCase() === REFERRAL_ASK.toLowerCase();
}

function ratio(part: number, whole: number): number | null {
  return whole > 0 ? part / whole : null;
}

export interface FunnelRow {
  month: string;
  leads: number;
  surveys: number;
  sph: number;
  won: number;
  leadToSurvey: number | null;
  surveyToSph: number | null;
  sphToWon: number | null;
  nilai: number;
}

/** Tiap tahap dihitung di bulan tahap itu terjadi, sama seperti tab Funnel Bulanan di sheet. */
export function buildFunnel(leads: Lead[], rabs: Rab[], months: string[]): FunnelRow[] {
  const leadIds = new Set(leads.map((l) => l.id));
  const firstSph = new Map<string, string>();
  for (const rab of rabs) {
    const sent = monthOf(rab.sent_at);
    if (!sent || !leadIds.has(rab.lead_id)) continue;
    const current = firstSph.get(rab.lead_id);
    if (!current || sent < current) firstSph.set(rab.lead_id, sent);
  }
  const sphMonths = [...firstSph.values()];
  const wonLeads = leads.filter((l) => l.status === "Deal Won");

  return months.map((month) => {
    const won = wonLeads.filter((l) => monthOf(l.closed_at) === month);
    const count = {
      leads: leads.filter((l) => monthOf(l.created_at) === month).length,
      surveys: leads.filter((l) => monthOf(l.survey_date) === month).length,
      sph: sphMonths.filter((m) => m === month).length,
      won: won.length,
    };
    return {
      month,
      ...count,
      leadToSurvey: ratio(count.surveys, count.leads),
      surveyToSph: ratio(count.sph, count.surveys),
      sphToWon: ratio(count.won, count.sph),
      nilai: won.reduce((sum, l) => sum + (l.nominal_deal ?? 0), 0),
    };
  });
}

export interface SourceRow {
  source: string;
  leads: number;
  surveys: number;
  won: number;
  leadToWon: number | null;
  nilai: number;
  porsiNilai: number | null;
}

function sourceRow(source: string, leads: Lead[], totalNilai: number): SourceRow {
  const won = leads.filter((l) => l.status === "Deal Won");
  const nilai = won.reduce((sum, l) => sum + (l.nominal_deal ?? 0), 0);
  return {
    source,
    leads: leads.length,
    surveys: leads.filter((l) => l.survey_date).length,
    won: won.length,
    leadToWon: ratio(won.length, leads.length),
    nilai,
    porsiNilai: ratio(nilai, totalNilai),
  };
}

/** Sumber kosong atau di luar daftar masuk Lainnya. */
export function buildSourceRows(leads: Lead[]): { rows: SourceRow[]; ask: SourceRow } {
  const known = new Set<string>(SOURCES);
  const totalNilai = leads
    .filter((l) => l.status === "Deal Won")
    .reduce((sum, l) => sum + (l.nominal_deal ?? 0), 0);
  const rows = SOURCES.map((source) =>
    sourceRow(
      source,
      leads.filter((l) => (l.source && known.has(l.source) ? l.source : "Lainnya") === source),
      totalNilai
    )
  );
  return { rows, ask: sourceRow(REFERRAL_ASK, leads.filter(isAskLead), totalNilai) };
}

/** Alasan lama berupa teks bebas masuk Lainnya, auto-lost dihitung Tidak ada respons. */
export function normalizeLostReason(reason?: string | null): string {
  if (reason?.startsWith("Auto-lost")) return "Tidak ada respons";
  return reason && (LOST_REASONS as readonly string[]).includes(reason) ? reason : "Lainnya";
}

export function buildLostReasons(leads: Lead[]): { reason: string; count: number }[] {
  const lost = leads.filter((l) => l.status === "Deal Lost");
  return LOST_REASONS
    .map((reason) => ({ reason, count: lost.filter((l) => normalizeLostReason(l.alasan_lost) === reason).length }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface KpiRow {
  month: string;
  omzet: number;
  omzetAsk: number;
  porsiAsk: number | null;
  reviewTotal: number | null;
  reviewBaru: number | null;
  budgetIklan: number | null;
  leadIklan: number;
  biayaPerLead: number | null;
}

export interface KpiInput {
  leads: Lead[];
  projects: Project[];
  invoices: Invoice[];
  payments: Payment[];
  kpi: MarketingKpiMonthly[];
}

/** Omzet = pembayaran masuk di bulan itu. Omzet ASK ditelusuri dari invoice ke lead-nya. */
export function buildKpi({ leads, projects, invoices, payments, kpi }: KpiInput, months: string[]): KpiRow[] {
  const askLeadIds = new Set(leads.filter(isAskLead).map((l) => l.id));
  const projectLead = new Map(projects.map((p) => [p.id, p.lead_id]));
  const askInvoiceIds = new Set(
    invoices
      .filter((inv) => {
        const leadId = inv.lead_id ?? (inv.project_id ? projectLead.get(inv.project_id) : undefined);
        return !!leadId && askLeadIds.has(leadId);
      })
      .map((inv) => inv.id)
  );
  const kpiByMonth = new Map(kpi.map((row) => [row.bulan.slice(0, 7), row]));

  // Review baru butuh angka bulan sebelumnya, jadi dihitung dari bulan terlama.
  let previousReview = MARKETING_TARGETS.reviewAwal;
  const rows = [...months].sort().map((month) => {
    const paid = payments.filter((p) => monthOf(p.payment_date) === month);
    const omzet = paid.reduce((sum, p) => sum + p.amount, 0);
    const omzetAsk = paid.filter((p) => askInvoiceIds.has(p.invoice_id)).reduce((sum, p) => sum + p.amount, 0);
    const manual = kpiByMonth.get(month);
    const reviewTotal = manual?.review_google_total ?? null;
    const reviewBaru = reviewTotal == null ? null : reviewTotal - previousReview;
    if (reviewTotal != null) previousReview = reviewTotal;
    const budgetIklan = manual?.budget_iklan ?? null;
    const leadIklan = leads.filter((l) => l.source === AD_SOURCE && monthOf(l.created_at) === month).length;
    return {
      month,
      omzet,
      omzetAsk,
      porsiAsk: ratio(omzetAsk, omzet),
      reviewTotal,
      reviewBaru,
      budgetIklan,
      leadIklan,
      biayaPerLead: budgetIklan == null ? null : ratio(budgetIklan, leadIklan),
    };
  });
  return rows.reverse();
}
