"use client";
import { formatIDR } from "@/utils/format";
import type { FunnelRow } from "@/utils/marketingCalculations";
import { formatMonth, formatRatio } from "./format";

type Props = {
  rows: FunnelRow[];
  lostReasons: { reason: string; count: number }[];
  loading: boolean;
  excludeAsk: boolean;
  onExcludeAskChange: (value: boolean) => void;
};

const TH_LEFT = "text-left px-3 py-2 text-xs font-medium text-muted";
const TH_RIGHT = "text-right px-3 py-2 text-xs font-medium text-muted whitespace-nowrap";
const TD_NUM = "px-3 py-2 text-right font-mono text-ink";

export function FunnelTab({ rows, lostReasons, loading, excludeAsk, onExcludeAskChange }: Props) {
  if (loading) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>;

  const totalLost = lostReasons.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">12 bulan terakhir. Lead ke Survey menunjukkan bocor setelah tanya harga, SPH ke Deal Won menunjukkan bocor setelah SPH.</p>
        <label className="flex items-center gap-2 text-[13px] text-ink cursor-pointer shrink-0">
          <input type="checkbox" checked={excludeAsk} onChange={(e) => onExcludeAskChange(e.target.checked)} className="accent-accent" />
          Tanpa PT ASK
        </label>
      </div>

      <div className="bg-white rounded-md border border-line overflow-x-auto">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th className={TH_LEFT}>Bulan</th>
              <th className={TH_RIGHT}>Lead</th>
              <th className={TH_RIGHT}>Survey</th>
              <th className={TH_RIGHT}>SPH</th>
              <th className={TH_RIGHT}>Deal Won</th>
              <th className={TH_RIGHT}>Lead ke Survey</th>
              <th className={TH_RIGHT}>Survey ke SPH</th>
              <th className={TH_RIGHT}>SPH ke Deal Won</th>
              <th className={TH_RIGHT}>Nilai Deal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.month} className="hover:bg-hover transition-colors">
                <td className="px-3 py-2 text-ink whitespace-nowrap">{formatMonth(row.month)}</td>
                <td className={TD_NUM}>{row.leads}</td>
                <td className={TD_NUM}>{row.surveys}</td>
                <td className={TD_NUM}>{row.sph}</td>
                <td className={TD_NUM}>{row.won}</td>
                <td className={TD_NUM}>{formatRatio(row.leadToSurvey)}</td>
                <td className={TD_NUM}>{formatRatio(row.surveyToSph)}</td>
                <td className={TD_NUM}>{formatRatio(row.sphToWon)}</td>
                <td className={`${TD_NUM} whitespace-nowrap`}>{row.nilai > 0 ? formatIDR(row.nilai) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-md border border-line p-4 space-y-2">
        <h2 className="text-sm font-semibold text-ink">
          {lostReasons.length > 0 ? `Alasan batal terbanyak: ${lostReasons[0].reason}` : "Alasan batal"}
        </h2>
        {lostReasons.length === 0 ? (
          <p className="text-sm text-faint">Belum ada lead Deal Lost.</p>
        ) : (
          <ul className="divide-y divide-line">
            {lostReasons.map((row) => (
              <li key={row.reason} className="flex items-center justify-between gap-3 py-1.5 text-[13px]">
                <span className="text-ink">{row.reason}</span>
                <span className="font-mono text-muted">{row.count} · {formatRatio(row.count / totalLost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
