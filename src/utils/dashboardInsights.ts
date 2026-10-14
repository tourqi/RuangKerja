// Penjelasan otomatis per kartu Dashboard V2 — berbasis aturan, tanpa AI.
// Murni: hanya membaca hasil buildDashboard, jadi angka di kalimat selalu
// sama dengan angka di grafik. Tiap kartu maksimal 3 kalimat, urut prioritas.

import {
  EXPENSE_LABELS, GENERAL_LABELS, shortIDR, type DashboardData, type ProjectHealth,
} from "@/utils/dashboardCalculations";

export type InsightTone = "info" | "success" | "warning" | "danger";
export interface Insight { tone: InsightTone; text: string }
export type InsightKey = "cashflow" | "profit" | "aging" | "health" | "billing" | "funnel" | "sources";

const MAX_PER_CARD = 3;
const pct = (v: number) => `${Math.round(v)}%`;
const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} dan ${xs.at(-1)}`);
const costLabel = (k: string) =>
  (EXPENSE_LABELS as Record<string, string>)[k] ?? (GENERAL_LABELS as Record<string, string>)[k] ?? k;

/** Waktu sudah jauh di depan progres (dan belum lewat tenggat). */
export const isBehind = (h: ProjectHealth) => h.timePct != null && h.daysLate === 0 && h.timePct - h.progress >= 25;
/** Biaya terpakai jauh di depan progres pekerjaan. */
export const isOverCost = (h: ProjectHealth) => h.cost > 0 && h.costPct - h.progress >= 30;

function cashflow(d: DashboardData): Insight[] {
  if (d.kasMasuk === 0 && d.pengeluaran === 0) return [];
  const out: Insight[] = [];
  const [y, m, dd] = d.period.to.split("-").map(Number);
  const partial = dd < new Date(Date.UTC(y, m, 0)).getUTCDate();
  const full = partial ? d.months.slice(0, -1) : d.months;

  const deficit = d.months.filter((mo) => mo.keluar > mo.masuk);
  if (deficit.length > 0) {
    out.push({
      tone: "warning",
      text: `Pengeluaran lebih besar dari pemasukan di ${join(deficit.map((mo) => mo.label))} (selisih ${shortIDR(sum(deficit.map((mo) => mo.keluar - mo.masuk)))}). Siapkan dana cadangan untuk bulan seperti ini.`,
    });
  } else {
    out.push({ tone: "success", text: "Setiap bulan pemasukan masih menutup pengeluaran, jadi saldo kas tidak pernah turun." });
  }

  if (full.length >= 6) {
    const last = full.slice(-3), prev = full.slice(-6, -3);
    const a = sum(last.map((mo) => mo.masuk)), b = sum(prev.map((mo) => mo.masuk));
    const change = share(a - b, b);
    if (b > 0 && Math.abs(change) >= 15) {
      out.push({
        tone: change < 0 ? "warning" : "success",
        text: `Pemasukan ${last[0].label}–${last[2].label} ${change < 0 ? "turun" : "naik"} ${pct(Math.abs(change))} dibanding ${prev[0].label}–${prev[2].label} (${shortIDR(a)} vs ${shortIDR(b)}).`,
      });
    } else if (b > 0) {
      out.push({ tone: "info", text: `Pemasukan 3 bulan terakhir relatif stabil dibanding 3 bulan sebelumnya (${shortIDR(a)} vs ${shortIDR(b)}).` });
    }
  }

  if (partial) out.push({ tone: "info", text: `${d.months.at(-1)!.label} masih berjalan, jadi angka bulan ini belum lengkap.` });
  return out;
}

function profit(d: DashboardData): Insight[] {
  if (d.kasMasuk === 0) return [];
  const out: Insight[] = [];
  const net = share(d.labaBersih, d.kasMasuk);
  if (d.labaBersih < 0) {
    out.push({ tone: "danger", text: `Pengeluaran ${shortIDR(d.pengeluaran)} melebihi kas masuk ${shortIDR(d.kasMasuk)}, jadi periode ini rugi ${shortIDR(-d.labaBersih)} secara kas.` });
  } else {
    out.push({
      tone: net < 10 ? "warning" : "info",
      text: `Setelah biaya proyek tersisa ${pct(share(d.labaKotor, d.kasMasuk))} (laba kotor); setelah biaya umum tinggal ${pct(net)}${net < 10 ? ", margin yang tipis" : ""}.`,
    });
  }
  const [top] = [...Object.entries(d.projCost), ...Object.entries(d.genCost)].sort((a, b) => b[1] - a[1]);
  if (top) {
    out.push({ tone: "info", text: `${costLabel(top[0])} menyerap ${pct(share(top[1], d.kasMasuk))} dari kas masuk. Ini pos pertama yang perlu dicek kalau ingin menaikkan margin.` });
  }
  out.push({ tone: "info", text: "Hitungan berbasis kas: uang yang benar-benar diterima dikurangi biaya yang dicatat di periode ini, jadi bisa berbeda dari laba per proyek." });
  return out;
}

function aging(d: DashboardData): Insight[] {
  if (d.piutang === 0) return [];
  if (d.piutangLewat === 0) return [{ tone: "success", text: "Semua piutang belum jatuh tempo. Cukup pantau tanggal jatuh temponya." }];
  const out: Insight[] = [];
  const old = d.aging[4].amount;
  if (old > 0) {
    out.push({ tone: "danger", text: `${shortIDR(old)} (${pct(share(old, d.piutang))} piutang) sudah lewat lebih dari 90 hari. Makin lama dibiarkan, makin kecil peluang tertagih.` });
  }
  const [top] = d.debtors;
  if (top) {
    out.push({
      tone: "warning",
      text: d.debtors.length === 1
        ? `Seluruh piutang lewat tempo ada di ${top.client} (${top.count} invoice).`
        : `${pct(share(top.amount, d.piutangLewat))} piutang lewat tempo ada di ${top.client} (${top.count} invoice, ${shortIDR(top.amount)}). Mulai penagihan dari sini.`,
    });
  }
  return out;
}

function health(d: DashboardData): Insight[] {
  if (d.health.length === 0) return [];
  const out: Insight[] = [];
  const late = d.health.filter((h) => h.daysLate > 0).sort((a, b) => b.daysLate - a.daysLate);
  if (late.length > 0) {
    out.push({ tone: "danger", text: `${join(late.slice(0, 3).map((h) => `${h.name} (${h.daysLate} hari)`))}${late.length > 3 ? ` dan ${late.length - 3} lainnya` : ""} sudah lewat tenggat. Perbarui deadline atau percepat penyelesaian.` });
  }
  const behind = d.health.filter(isBehind);
  if (behind.length > 0) {
    const h = behind[0];
    out.push({ tone: "warning", text: `${h.name} tertinggal jadwal: waktu sudah berjalan ${pct(h.timePct!)}, progres baru ${h.progress}%${behind.length > 1 ? ` (+${behind.length - 1} proyek lain serupa)` : ""}.` });
  }
  const over = d.health.filter(isOverCost);
  if (over.length > 0) {
    const h = over[0];
    out.push({ tone: "danger", text: `Biaya ${h.name} sudah ${pct(h.costPct)} dari kontrak, padahal progres ${h.progress}%. Berisiko rugi kalau tidak dikendalikan.` });
  }
  if (out.length === 0) out.push({ tone: "success", text: "Semua proyek berjalan sesuai jadwal dan biayanya masih sejalan dengan progres." });
  return out;
}

function billing(d: DashboardData): Insight[] {
  if (d.health.length === 0) return [];
  const out: Insight[] = [];
  const ready = d.health
    .filter((h) => h.value > 0 && h.progress - share(h.billed, h.value) >= 20)
    .map((h) => ({ h, amount: (h.value * h.progress) / 100 - h.billed }))
    .sort((a, b) => b.amount - a.amount);
  if (ready.length > 0) {
    const { h, amount } = ready[0];
    out.push({ tone: "info", text: `${h.name} sudah ${h.progress}% selesai tapi baru ditagih ${pct(share(h.billed, h.value))}, jadi masih bisa ditagih sekitar ${shortIDR(amount)}.` });
    if (ready.length > 1) out.push({ tone: "info", text: `Total ${ready.length} proyek bisa ditagih sesuai progres, sekitar ${shortIDR(sum(ready.map((r) => r.amount)))}.` });
  }
  const overBilled = d.health.filter((h) => h.value > 0 && h.billed > h.value * 1.01);
  if (overBilled.length > 0) {
    const h = overBilled[0];
    out.push({ tone: "warning", text: `${h.name} ditagih ${pct(share(h.billed, h.value))} dari kontrak. Cek apakah ada addendum yang belum masuk RAB, atau invoice salah input.` });
  }
  const noRab = d.health.filter((h) => h.value === 0).length;
  if (noRab > 0) out.push({ tone: "warning", text: `${noRab} proyek belum punya RAB disetujui, jadi nilai kontraknya belum ikut dihitung.` });
  if (out.length === 0 && d.belumDitagih === 0) out.push({ tone: "success", text: "Semua kontrak berjalan sudah ditagih penuh. Tinggal pastikan pembayarannya masuk." });
  return out;
}

const NEXT_STEP: Record<string, string> = {
  "New Lead": "hubungi dan kualifikasi",
  Contacted: "jadwalkan survey",
  Survey: "kirim penawaran / RAB",
  Deal: "finalisasi kontrak dan DP",
};

function funnel(d: DashboardData): Insight[] {
  const open = sum(d.funnel.map((f) => f.count));
  const out: Insight[] = [];
  if (open > 0) {
    const top = [...d.funnel].sort((a, b) => b.count - a.count)[0];
    if (top.count >= 2 && share(top.count, open) >= 40) {
      out.push({ tone: "warning", text: `${pct(share(top.count, open))} lead terbuka menumpuk di tahap ${top.stage}. Langkah berikutnya: ${NEXT_STEP[top.stage]}.` });
    }
  }
  if (d.closedCount > 0) {
    out.push({
      tone: "info",
      text: `${d.wonCount} dari ${d.closedCount} lead yang ditutup periode ini jadi deal${d.avgCloseDays != null ? `, rata-rata ${Math.round(d.avgCloseDays)} hari dari lead masuk sampai deal` : ""}.`,
    });
  }
  const inDeal = d.funnel[3].count;
  if (inDeal > 0 && d.wonCount > 0 && d.nilaiDeal > 0) {
    out.push({ tone: "success", text: `Kalau ${inDeal} lead di tahap Deal closing dengan nilai rata-rata, potensinya sekitar ${shortIDR((d.nilaiDeal / d.wonCount) * inDeal)}.` });
  }
  return out;
}

function sources(d: DashboardData): Insight[] {
  if (d.sources.length === 0) return [];
  const out: Insight[] = [];
  const rate = (s: DashboardData["sources"][number]) => s.won / (s.won + s.lost);
  const best = d.sources.filter((s) => s.won > 0 && s.won + s.lost >= 2).sort((a, b) => rate(b) - rate(a))[0];
  if (best) out.push({ tone: "success", text: `${best.source} paling efektif: ${best.won} dari ${best.won + best.lost} lead yang sudah selesai jadi deal.` });
  const weak = d.sources.find((s) => s.won === 0 && s.lost > 0 && s.won + s.open + s.lost >= 3);
  if (weak) out.push({ tone: "warning", text: `${weak.source}: ${weak.won + weak.open + weak.lost} lead tapi belum ada yang jadi deal. Evaluasi kualitas lead dari kanal ini.` });
  if (d.marketing > 0) {
    if (d.wonCount === 0) {
      out.push({ tone: "warning", text: `Sudah keluar ${shortIDR(d.marketing)} untuk marketing, tapi belum ada deal di periode ini.` });
    } else {
      const perDeal = d.marketing / d.wonCount;
      out.push({ tone: "info", text: `Biaya marketing per deal ${shortIDR(perDeal)}${d.nilaiDeal > 0 ? `, setara ${pct(share(perDeal, d.nilaiDeal / d.wonCount))} dari rata-rata nilai deal` : ""}.` });
    }
  }
  const unknown = d.sources.find((s) => s.source === "Tanpa sumber");
  const total = sum(d.sources.map((s) => s.won + s.open + s.lost));
  if (unknown && share(unknown.won + unknown.open + unknown.lost, total) >= 30) {
    out.push({ tone: "info", text: `${pct(share(unknown.won + unknown.open + unknown.lost, total))} lead tidak dicatat sumbernya. Isi kolom sumber supaya analisis kanal lebih akurat.` });
  }
  return out;
}

export function buildInsights(d: DashboardData): Record<InsightKey, Insight[]> {
  const all = { cashflow: cashflow(d), profit: profit(d), aging: aging(d), health: health(d), billing: billing(d), funnel: funnel(d), sources: sources(d) };
  return Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.slice(0, MAX_PER_CARD)])) as Record<InsightKey, Insight[]>;
}
