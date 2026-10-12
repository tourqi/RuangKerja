"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useAllPayments } from "@/hooks/usePayments";
import { useAllExpenses } from "@/hooks/useExpenses";
import { useGeneralExpenses } from "@/hooks/useGeneralExpenses";
import { useApprovedRabTotals } from "@/hooks/useRab";
import {
  buildDashboard, periodFor, shortIDR, EXPENSE_LABELS, GENERAL_LABELS,
  type DashboardData, type Period, type PeriodKind,
} from "@/utils/dashboardCalculations";
import type { ExpenseCategory, GeneralExpenseKategori } from "@/types/db";
import { formatDate } from "@/utils/format";

/**
 * Dashboard versi 2 — laporan manajerial berbasis grafik. Tiap blok menjawab
 * satu pertanyaan bisnis dan judulnya menyebut kesimpulan dari data.
 * Versi lama disimpan di DashboardV1.
 */

// Warna grafik (palet tervalidasi CVD; sama dengan token di globals.css)
const C = {
  s1: "#3247d1", s2: "#eb6834", s2b: "#f3b392", ink: "#0f1115", grid: "#eef0f2", base: "#e5e7eb",
  faint: "#6b717a", danger: "#c4352b", warning: "#9a6312", success: "#2a7d46", grey: "#c9cdd3",
};

const PERIODS: { key: Exclude<PeriodKind, "custom">; label: string }[] = [
  { key: "30d", label: "30 hari" }, { key: "quarter", label: "Kuartal ini" }, { key: "year", label: "Tahun ini" },
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (d: string) => formatDate(d);
const pct = (v: number) => `${Math.round(v)}%`;

/** Batas atas sumbu yang "bulat" dengan ±4 garis bantu. */
function niceScale(max: number, min = 0) {
  const span = Math.max(1, max - min);
  const raw = span / 4, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step || step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(t);
  return { lo, hi, ticks };
}
const axisLabel = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 1e9) return `${s}${(a / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}`;
  if (a === 0) return "0";
  return `${s}${(a / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
};
const barLabel = (v: number) => shortIDR(v).replace("Rp", "");

/* ───────────────────────── building blocks ───────────────────────── */

function Card({ title, sub, children, className = "" }: { title: string; sub?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-md border border-line flex flex-col min-w-0 ${className}`}>
      <header className="px-4 pt-3 space-y-0.5">
        <h3 className="text-[13px] font-semibold text-ink text-balance">{title}</h3>
        {sub && <p className="text-xs text-muted">{sub}</p>}
      </header>
      <div className="px-4 pt-2.5 pb-4 flex-1">{children}</div>
    </section>
  );
}

function Keys({ items }: { items: { label: string; color: string; kind?: "box" | "line" | "mark" }[] }) {
  return (
    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted mb-1.5">
      {items.map((k) => (
        <span key={k.label} className="inline-flex items-center gap-1.5">
          <i
            className={k.kind === "line" ? "w-3.5 h-0.5 rounded-sm" : k.kind === "mark" ? "w-0.5 h-3 rounded-sm" : "w-2.5 h-2.5 rounded-[2px]"}
            style={{ background: k.color }}
          />
          {k.label}
        </span>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="h-40 flex items-center justify-center text-xs text-faint text-center px-4">{children}</div>;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 120, h = 30;
  const min = Math.min(0, ...data), max = Math.max(...data, min + 1);
  const x = (i: number) => (data.length > 1 ? (i / (data.length - 1)) * w : w / 2);
  const y = (v: number) => h - 2 - ((v - min) / (max - min)) * (h - 4);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const floor = y(Math.max(0, min));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-[30px] overflow-visible" aria-hidden="true">
      {min < 0 && <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={C.base} vectorEffect="non-scaling-stroke" />}
      <polygon points={`0,${floor} ${pts} ${w},${floor}`} fill={color} opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StackBar({ parts, title }: { parts: { value: number; color: string }[]; title: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="flex h-2 rounded bg-hover overflow-hidden gap-0.5 my-[11px]" title={title}>
      {total > 0 && parts.filter((p) => p.value > 0).map((p, i) => (
        <i key={i} className="block h-full" style={{ flex: p.value, background: p.color }} />
      ))}
    </div>
  );
}

/* ───────────────────────── charts ───────────────────────── */

function CashFlowChart({ months }: { months: DashboardData["months"] }) {
  const W = 640, H = 230, L = 44, R = 12, T = 18, B = 26;
  const cumulative = months.reduce<number[]>((acc, m) => [...acc, (acc.at(-1) ?? 0) + m.masuk - m.keluar], []);
  const { lo, hi, ticks } = niceScale(Math.max(...months.map((m) => Math.max(m.masuk, m.keluar)), ...cumulative, 1), Math.min(0, ...cumulative));
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const band = (W - L - R) / months.length, bw = Math.min(24, band / 2 - 4);
  const peak = cumulative.indexOf(Math.max(...cumulative));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label="Arus kas per bulan">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.base : C.grid} />
          <text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="fill-faint text-[10.5px]">{axisLabel(t)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const cx = L + band * i + band / 2;
        return (
          <g key={m.key}>
            <rect x={L + band * i} y={T} width={band} height={H - T - B} className="fill-transparent hover:fill-ink/[0.04]">
              <title>{`${m.label}: masuk ${shortIDR(m.masuk)}, keluar ${shortIDR(m.keluar)}, saldo ${shortIDR(cumulative[i])}`}</title>
            </rect>
            {m.masuk > 0 && <rect x={cx - bw - 1} y={y(m.masuk)} width={bw} height={y(0) - y(m.masuk)} rx={3} fill={C.s1} pointerEvents="none" />}
            {m.keluar > 0 && <rect x={cx + 1} y={y(m.keluar)} width={bw} height={Math.max(1.5, y(0) - y(m.keluar))} rx={3} fill={C.s2} pointerEvents="none" />}
            <text x={cx} y={H - 8} textAnchor="middle" className="fill-faint text-[10.5px]">{m.label}</text>
          </g>
        );
      })}
      <polyline
        points={cumulative.map((v, i) => `${L + band * i + band / 2},${y(v)}`).join(" ")}
        fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" pointerEvents="none"
      />
      {cumulative.map((v, i) => (
        <circle key={i} cx={L + band * i + band / 2} cy={y(v)} r={4} fill={C.ink} stroke="#fff" strokeWidth={2} pointerEvents="none" />
      ))}
      {[peak, cumulative.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
        <text key={i} x={L + band * i + band / 2} y={y(cumulative[i]) - 10} textAnchor="middle" className="fill-ink text-[10.5px] font-medium">
          {barLabel(cumulative[i])}
        </text>
      ))}
    </svg>
  );
}

function WaterfallChart({ d }: { d: DashboardData }) {
  type Step = { name: string; value: number; kind: "total" | "proj" | "gen" };
  const steps: Step[] = [{ name: "Kas masuk", value: d.kasMasuk, kind: "total" }];
  (Object.keys(EXPENSE_LABELS) as ExpenseCategory[]).forEach((k) => d.projCost[k] && steps.push({ name: EXPENSE_LABELS[k], value: -d.projCost[k], kind: "proj" }));
  steps.push({ name: "Laba kotor", value: d.labaKotor, kind: "total" });
  (Object.keys(GENERAL_LABELS) as GeneralExpenseKategori[]).forEach((k) => d.genCost[k] && steps.push({ name: GENERAL_LABELS[k], value: -d.genCost[k], kind: "gen" }));
  steps.push({ name: "Laba bersih", value: d.labaBersih, kind: "total" });

  // posisi tiap batang
  let level = 0;
  const bars = steps.map((s) => {
    if (s.kind === "total") { level = s.value; return { ...s, top: Math.max(0, s.value), bot: Math.min(0, s.value), end: s.value }; }
    const from = level; level += s.value;
    return { ...s, top: Math.max(from, level), bot: Math.min(from, level), end: level };
  });
  const { lo, hi, ticks } = niceScale(Math.max(...bars.map((b) => b.top), 1), Math.min(0, ...bars.map((b) => b.bot)));
  const W = 640, H = 250, L = 44, R = 8, T = 20, B = 40;
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const band = (W - L - R) / bars.length, bw = Math.min(36, band - 14);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label="Waterfall laba rugi">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.base : C.grid} />
          <text x={L - 8} y={y(t) + 3.5} textAnchor="end" className="fill-faint text-[10.5px]">{axisLabel(t)}</text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = L + band * i + (band - bw) / 2, cx = x + bw / 2;
        const fill = b.kind === "total" ? (b.value < 0 ? C.danger : C.s1) : b.kind === "proj" ? C.s2 : C.s2b;
        const words = b.name.split(" ");
        return (
          <g key={b.name}>
            {i > 0 && <line x1={x - (band - bw)} x2={x} y1={y(bars[i - 1].end)} y2={y(bars[i - 1].end)} stroke={C.faint} strokeDasharray="2 2" />}
            <rect x={x} y={y(b.top)} width={bw} height={Math.max(1.5, y(b.bot) - y(b.top))} rx={3} fill={fill}>
              <title>{`${b.name}: ${shortIDR(b.value)}`}</title>
            </rect>
            <text x={cx} y={y(b.top) - 6} textAnchor="middle" className="fill-ink text-[10.5px] font-medium">{barLabel(b.value)}</text>
            {words.map((w, j) => (
              <text key={j} x={cx} y={H - B + 16 + j * 12} textAnchor="middle" className="fill-faint text-[10.5px]">{w}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function AgingChart({ aging }: { aging: DashboardData["aging"] }) {
  const W = 320, H = 230, L = 34, R = 6, T = 20, B = 40;
  const colors = [C.s1, C.warning, C.warning, C.danger, C.danger];
  const { lo, hi, ticks } = niceScale(Math.max(...aging.map((a) => a.amount), 1));
  const y = (v: number) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const band = (W - L - R) / aging.length, bw = 30;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible" role="img" aria-label="Umur piutang">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.base : C.grid} />
          <text x={L - 6} y={y(t) + 3.5} textAnchor="end" className="fill-faint text-[10.5px]">{axisLabel(t)}</text>
        </g>
      ))}
      {aging.map((a, i) => {
        const cx = L + band * i + band / 2;
        const [l1, ...rest] = a.label.split(" ");
        return (
          <g key={a.label}>
            {a.amount > 0 && (
              <>
                <rect x={cx - bw / 2} y={y(a.amount)} width={bw} height={y(0) - y(a.amount)} rx={3} fill={colors[i]}>
                  <title>{`${a.label}: ${shortIDR(a.amount)}`}</title>
                </rect>
                <text x={cx} y={y(a.amount) - 6} textAnchor="middle" className="fill-ink text-[10.5px] font-medium">{barLabel(a.amount)}</text>
              </>
            )}
            <text x={cx} y={H - B + 16} textAnchor="middle" className="fill-faint text-[10.5px]">{l1}</text>
            <text x={cx} y={H - B + 28} textAnchor="middle" className="fill-faint text-[10.5px]">{rest.join(" ")}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Baris bar horizontal berbasis HTML (lebar % = skala persis). */
function HRow({ label, sub, title, children }: { label: string; sub?: string; title: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[128px_1fr] max-sm:grid-cols-[96px_1fr] gap-2.5 items-center" title={title}>
      <span className="text-[12.5px] text-ink leading-tight min-w-0">
        <span className="block truncate">{label}</span>
        {sub && <small className="block text-[11px] text-faint truncate">{sub}</small>}
      </span>
      <div className="relative grid gap-[3px] min-w-0">{children}</div>
    </div>
  );
}
const Bar = ({ width, color }: { width: number; color: string }) => (
  <div className="h-[9px] bg-hover rounded-r relative">
    <i className="absolute inset-y-0 left-0 rounded-r" style={{ width: `${Math.min(100, Math.max(0, width))}%`, background: color }} />
  </div>
);
const Segments = ({ width, parts }: { width: number; parts: { value: number; color: string }[] }) => (
  <div className="h-[9px] flex gap-0.5" style={{ width: `${Math.min(100, width)}%` }}>
    {parts.filter((p) => p.value > 0).map((p, i, arr) => (
      <i key={i} className={`block h-full ${i === arr.length - 1 ? "rounded-r" : ""}`} style={{ flex: p.value, background: p.color }} />
    ))}
  </div>
);
const Axis = ({ labels }: { labels: string[] }) => (
  <div className="flex justify-between text-[10.5px] text-faint mt-1.5 ml-[138px] max-sm:ml-[106px]">
    {labels.map((l) => <span key={l}>{l}</span>)}
  </div>
);

/* ───────────────────────── page ───────────────────────── */

export default function DashboardV2() {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const { invoices, loading: li } = useInvoices();
  const { payments, loading: lpay } = useAllPayments();
  const { expenses: projectExpenses, loading: lpe } = useAllExpenses();
  const { expenses: generalExpenses, loading: lge } = useGeneralExpenses();
  const { totals: rabTotals, loading: lr } = useApprovedRabTotals();

  const today = todayISO();
  const [kind, setKind] = useState<PeriodKind>("year");
  const [custom, setCustom] = useState<Period>(() => periodFor("year", today));
  const period = kind === "custom" ? custom : periodFor(kind, today);

  const d = useMemo(() => buildDashboard({
    leads, projects, invoices, payments, projectExpenses, generalExpenses, rabTotals,
    clientNames: Object.fromEntries(clients.map((c) => [c.id, c.name])),
  }, period, today), [leads, projects, invoices, payments, projectExpenses, generalExpenses, rabTotals, clients, period.from, period.to, today]); // eslint-disable-line react-hooks/exhaustive-deps

  if (lc || ll || lp || li || lpay || lpe || lge || lr) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-line border-t-ink" />
      </div>
    );
  }

  const hasMoney = d.kasMasuk > 0 || d.pengeluaran > 0;
  const bestMonth = [...d.months].sort((a, b) => b.masuk - a.masuk)[0];
  const lateHealth = d.health.filter((h) => h.daysLate > 0).length;
  const topUnbilled = [...d.health].sort((a, b) => Math.max(0, b.value - b.billed) - Math.max(0, a.value - a.billed))[0];
  const openLeads = d.funnel.reduce((s, f) => s + f.count, 0);
  const topSource = d.sources[0];
  const maxContract = Math.max(1, ...d.health.map((h) => h.value));
  const maxSource = Math.max(1, ...d.sources.map((s) => s.won + s.open + s.lost));
  const maxFunnel = Math.max(1, ...d.funnel.map((f) => f.count));
  const biggestCost = [...Object.entries(d.projCost), ...Object.entries(d.genCost)].sort((a, b) => b[1] - a[1]).slice(0, 2);

  return (
    <div className="space-y-4">
      {/* Periode */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{fmtDate(period.from)} – {fmtDate(period.to)}</p>
        <div className="flex flex-wrap items-center gap-2">
          {kind === "custom" && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <input id="dash-from" type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))}
                className="px-2 py-1 border border-line rounded-md text-xs text-ink" />
              <span>–</span>
              <input id="dash-to" type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))}
                className="px-2 py-1 border border-line rounded-md text-xs text-ink" />
            </div>
          )}
          <div className="inline-flex border border-line rounded-md overflow-hidden" role="group" aria-label="Periode">
            {[...PERIODS, { key: "custom" as const, label: "Pilih tanggal" }].map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => { if (p.key === "custom") setCustom(period); setKind(p.key); }}
                aria-pressed={kind === p.key}
                className={`px-2.5 py-1 text-xs transition-colors ${i > 0 ? "border-l border-line" : ""} ${kind === p.key ? "bg-hover text-ink font-medium" : "bg-white text-muted hover:text-ink"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Angka utama */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 border border-line rounded-md bg-white overflow-hidden [&>div]:border-line [&>div]:border-b xl:[&>div]:border-b-0 [&>div]:border-r">
        <div className="px-4 py-3 grid gap-1 content-start">
          <span className="text-xs text-muted">Kas masuk</span>
          <strong className="font-mono text-lg font-medium text-ink">{shortIDR(d.kasMasuk)}</strong>
          <Sparkline data={d.months.map((m) => m.masuk)} color={C.s1} />
          <small className="text-[11.5px] text-faint">Pembayaran dari klien</small>
        </div>
        <div className="px-4 py-3 grid gap-1 content-start">
          <span className="text-xs text-muted">Pengeluaran</span>
          <strong className="font-mono text-lg font-medium text-ink">{shortIDR(d.pengeluaran)}</strong>
          <Sparkline data={d.months.map((m) => m.keluar)} color={C.s2} />
          <small className="text-[11.5px] text-faint">Proyek {barLabel(d.biayaProyek)} · umum {barLabel(d.biayaUmum)}</small>
        </div>
        <div className="px-4 py-3 grid gap-1 content-start">
          <span className="text-xs text-muted">Laba bersih</span>
          <strong className={`font-mono text-lg font-medium ${d.labaBersih < 0 ? "text-danger" : "text-ink"}`}>{shortIDR(d.labaBersih)}</strong>
          <Sparkline data={d.months.map((m) => m.masuk - m.keluar)} color={C.ink} />
          <small className="text-[11.5px] text-faint">{d.kasMasuk > 0 ? `${pct((d.labaBersih / d.kasMasuk) * 100)} dari kas masuk` : "Belum ada kas masuk"}</small>
        </div>
        <div className="px-4 py-3 grid gap-1 content-start">
          <span className="text-xs text-muted">Piutang</span>
          <strong className={`font-mono text-lg font-medium ${d.piutangLewat > 0 ? "text-danger" : "text-ink"}`}>{shortIDR(d.piutang)}</strong>
          <StackBar
            title={d.aging.map((a) => `${a.label}: ${shortIDR(a.amount)}`).join(" · ")}
            parts={d.aging.map((a, i) => ({ value: a.amount, color: [C.s1, C.warning, C.warning, C.danger, C.danger][i] }))}
          />
          <small className="text-[11.5px] text-faint">{d.piutang > 0 ? `${pct((d.piutangLewat / d.piutang) * 100)} lewat jatuh tempo` : "Tidak ada piutang"}</small>
        </div>
        <div className="px-4 py-3 grid gap-1 content-start">
          <span className="text-xs text-muted">Kontrak belum ditagih</span>
          <strong className="font-mono text-lg font-medium text-ink">{shortIDR(d.belumDitagih)}</strong>
          <StackBar
            title={`Sudah ditagih ${shortIDR(d.kontrakBerjalan - d.belumDitagih)} · belum ditagih ${shortIDR(d.belumDitagih)}`}
            parts={[{ value: d.kontrakBerjalan - d.belumDitagih, color: C.s1 }, { value: d.belumDitagih, color: C.grey }]}
          />
          <small className="text-[11.5px] text-faint">{d.kontrakBerjalan > 0 ? `${pct((d.belumDitagih / d.kontrakBerjalan) * 100)} dari kontrak berjalan` : "Belum ada proyek berjalan"}</small>
        </div>
      </div>

      {/* 2. Tindakan + arus kas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-4">
        <Card title="Perlu tindakan" sub="Diurutkan menurut dampak uang · posisi hari ini">
          {d.actions.length === 0 ? (
            <Empty>Tidak ada yang perlu ditindak. Piutang, proyek, dan follow-up aman.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {d.actions.slice(0, 6).map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="grid grid-cols-[10px_1fr] gap-2.5 items-baseline py-2 group">
                    <span className={`w-[7px] h-[7px] rounded-full ${a.tone === "danger" ? "bg-danger" : a.tone === "warning" ? "bg-warning" : "bg-accent"}`} />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-ink group-hover:underline">{a.title}</span>
                      <span className="block text-xs text-muted truncate">{a.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card
          title={hasMoney
            ? `Saldo kas ${d.labaBersih >= 0 ? "naik" : "turun"} ${shortIDR(Math.abs(d.labaBersih))} dalam periode ini${bestMonth.masuk > 0 ? `, pemasukan terbesar di ${bestMonth.label}` : ""}`
            : "Belum ada kas masuk atau keluar di periode ini"}
          sub={`Masuk vs keluar per bulan, dan saldo kumulatif sejak ${d.months[0].label} · juta rupiah`}
        >
          <Keys items={[{ label: "Kas masuk", color: C.s1 }, { label: "Pengeluaran", color: C.s2 }, { label: "Saldo kumulatif", color: C.ink, kind: "line" }]} />
          <CashFlowChart months={d.months} />
        </Card>
      </div>

      {/* 3. Laba + piutang */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
        <Card
          title={d.kasMasuk > 0 ? `Dari setiap Rp100 yang masuk, Rp${Math.round((d.labaBersih / d.kasMasuk) * 100)} jadi laba bersih` : "Belum ada kas masuk di periode ini"}
          sub={biggestCost.length > 0 ? `Biaya terbesar: ${biggestCost.map(([k, v]) => `${(EXPENSE_LABELS as Record<string, string>)[k] ?? (GENERAL_LABELS as Record<string, string>)[k]} ${barLabel(v)}`).join(" dan ")} · juta rupiah` : "Belum ada biaya tercatat"}
        >
          {hasMoney ? (
            <>
              <Keys items={[{ label: "Pendapatan & laba", color: C.s1 }, { label: "Biaya proyek", color: C.s2 }, { label: "Biaya umum", color: C.s2b }]} />
              <WaterfallChart d={d} />
            </>
          ) : <Empty>Pilih periode lain untuk melihat laba rugi.</Empty>}
        </Card>
        <Card
          title={d.piutang === 0 ? "Tidak ada piutang" : d.piutangLewat === d.piutang ? "Semua piutang sudah lewat jatuh tempo" : `${pct((d.piutangLewat / d.piutang) * 100)} piutang sudah lewat jatuh tempo`}
          sub={`Umur piutang · total ${shortIDR(d.piutang)} · juta rupiah`}
        >
          {d.piutang > 0 ? <AgingChart aging={d.aging} /> : <Empty>Semua invoice sudah lunas.</Empty>}
        </Card>
      </div>

      {/* 4. Proyek */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={d.health.length === 0 ? "Belum ada proyek berjalan" : lateHealth > 0 ? `${lateHealth} dari ${d.health.length} proyek berjalan sudah lewat tenggat` : "Semua proyek berjalan masih dalam tenggat"}
          sub="Progres, biaya terpakai (% kontrak), dan waktu yang sudah berjalan"
        >
          {d.health.length > 0 && (
            <>
              <Keys items={[{ label: "Progres", color: C.ink }, { label: "Biaya / kontrak", color: C.s2 }, { label: "Waktu berjalan", color: C.danger, kind: "mark" }]} />
              <div className="grid gap-3">
                {d.health.slice(0, 6).map((h) => {
                  const behind = h.timePct != null && h.daysLate === 0 && h.timePct - h.progress >= 25;
                  const overCost = h.cost > 0 && h.costPct - h.progress >= 30;
                  const note = [h.daysLate > 0 ? `Lewat ${h.daysLate} hari` : behind ? "Tertinggal jadwal" : "", overCost ? "biaya > progres" : ""].filter(Boolean).join(" · ");
                  return (
                    <Link key={h.id} href={`/projects/${h.id}`} className="block hover:bg-hover/60 -mx-1 px-1 rounded">
                      <HRow label={h.name} sub={h.client} title={`${h.name}: progres ${h.progress}%, biaya ${pct(h.costPct)} kontrak${h.timePct != null ? `, waktu ${pct(h.timePct)}` : ""}`}>
                        <div className="relative">
                          <Bar width={h.progress} color={C.ink} />
                          {h.timePct != null && <span className="absolute -top-[3px] -bottom-[3px] w-0.5 rounded-sm bg-danger" style={{ left: `calc(${Math.min(100, h.timePct)}% - 1px)` }} />}
                        </div>
                        <Bar width={h.costPct} color={C.s2} />
                        {note && <span className={`text-[11.5px] ${h.daysLate > 0 || overCost ? "text-danger" : "text-muted"}`}>{note}</span>}
                      </HRow>
                    </Link>
                  );
                })}
              </div>
              <Axis labels={["0%", "50%", "100%"]} />
            </>
          )}
        </Card>
        <Card
          title={d.belumDitagih > 0 ? `${shortIDR(d.belumDitagih)} nilai kontrak belum ditagih${topUnbilled && d.belumDitagih > 0 ? `, ${pct((Math.max(0, topUnbilled.value - topUnbilled.billed) / d.belumDitagih) * 100)} dari ${topUnbilled.client || topUnbilled.name}` : ""}` : "Semua kontrak berjalan sudah ditagih"}
          sub="Komposisi nilai kontrak per proyek"
        >
          {d.health.length > 0 && (
            <>
              <Keys items={[{ label: "Dibayar", color: C.s1 }, { label: "Ditagih, belum dibayar", color: C.warning }, { label: "Belum ditagih", color: C.grey }]} />
              <div className="grid gap-3">
                {d.health.slice(0, 6).map((h) => {
                  const paid = Math.min(h.paid, h.value), open = Math.max(0, Math.min(h.billed, h.value) - paid), rest = Math.max(0, h.value - h.billed);
                  return (
                    <HRow key={h.id} label={h.name} sub={`Kontrak ${shortIDR(h.value)}`} title={`${h.name}: dibayar ${shortIDR(h.paid)}, ditagih ${shortIDR(h.billed)}, kontrak ${shortIDR(h.value)}`}>
                      <Segments width={(h.value / maxContract) * 100} parts={[{ value: paid, color: C.s1 }, { value: open, color: C.warning }, { value: rest, color: C.grey }]} />
                      {h.value > 0 && h.billed > h.value * 1.01 && <span className="text-[11.5px] text-danger">Ditagih {shortIDR(h.billed)}, melebihi kontrak</span>}
                      {h.value === 0 && <span className="text-[11.5px] text-muted">Belum ada RAB disetujui</span>}
                    </HRow>
                  );
                })}
              </div>
              <Axis labels={["0", barLabel(maxContract / 2), barLabel(maxContract)]} />
            </>
          )}
        </Card>
      </div>

      {/* 5. Penjualan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title={openLeads === 0 ? "Tidak ada lead terbuka" : `${openLeads} lead terbuka, ${d.funnel[3].count > 0 ? `${d.funnel[3].count} sudah di tahap Deal` : "belum ada yang sampai tahap Deal"}`}
          sub="Jumlah lead per tahap pipeline · posisi hari ini"
        >
          <div className="grid gap-3">
            {d.funnel.map((f) => (
              <HRow key={f.stage} label={f.stage} title={`${f.stage}: ${f.count} lead`}>
                <div className="grid grid-cols-[1fr_28px] items-center gap-2">
                  <Bar width={(f.count / maxFunnel) * 100} color={C.s1} />
                  <b className="font-mono font-medium text-right">{f.count}</b>
                </div>
              </HRow>
            ))}
          </div>
          <div className="grid grid-cols-3 border-t border-line mt-3 pt-2.5">
            <div><p className="text-xs text-muted">Win rate</p><p className="font-mono text-[15px] font-medium">{d.winRate != null ? pct(d.winRate) : "—"}</p></div>
            <div><p className="text-xs text-muted">Rata-rata closing</p><p className="font-mono text-[15px] font-medium">{d.avgCloseDays != null ? `${Math.round(d.avgCloseDays)} hari` : "—"}</p></div>
            <div><p className="text-xs text-muted">Nilai deal</p><p className="font-mono text-[15px] font-medium">{d.wonCount > 0 ? shortIDR(d.nilaiDeal) : "—"}</p></div>
          </div>
        </Card>
        <Card
          title={!topSource ? "Belum ada lead baru di periode ini" : topSource.won > 0 ? `Deal terbanyak datang dari ${topSource.source}` : "Belum ada lead baru yang jadi deal di periode ini"}
          sub={`Lead baru per sumber dan hasilnya${d.marketing > 0 ? ` · biaya marketing ${shortIDR(d.marketing)}${d.wonCount > 0 ? `, ${shortIDR(d.marketing / d.wonCount)} per deal` : ""}` : ""}`}
        >
          {d.sources.length === 0 ? <Empty>Tidak ada lead yang dibuat di periode ini.</Empty> : (
            <>
              <Keys items={[{ label: "Deal", color: C.success }, { label: "Masih berjalan", color: C.s1 }, { label: "Lost", color: C.grey }]} />
              <div className="grid gap-3">
                {d.sources.slice(0, 6).map((s) => (
                  <HRow key={s.source} label={s.source} title={`${s.source}: ${s.won} deal, ${s.open} berjalan, ${s.lost} lost`}>
                    <Segments width={((s.won + s.open + s.lost) / maxSource) * 100} parts={[{ value: s.won, color: C.success }, { value: s.open, color: C.s1 }, { value: s.lost, color: C.grey }]} />
                  </HRow>
                ))}
              </div>
              <Axis labels={["0", String(Math.round(maxSource / 2 * 10) / 10), `${maxSource} lead`]} />
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
