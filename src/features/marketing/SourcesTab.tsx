"use client";
import { Fragment } from "react";
import { formatIDR } from "@/utils/format";
import type { SourceRow } from "@/utils/marketingCalculations";
import { formatRatio } from "./format";

type Props = {
  rows: SourceRow[];
  ask: SourceRow;
  loading: boolean;
};

const TH_RIGHT = "text-right px-3 py-2 text-xs font-medium text-muted whitespace-nowrap";
const TD_NUM = "px-3 py-2 text-right font-mono text-ink";

function Row({ row, label, nested }: { row: SourceRow; label: string; nested?: boolean }) {
  const textClass = nested ? "text-muted" : "text-ink";
  return (
    <tr className="hover:bg-hover transition-colors">
      <td className={`px-3 py-2 whitespace-nowrap ${textClass} ${nested ? "pl-7" : ""}`}>{label}</td>
      <td className={TD_NUM}>{row.leads}</td>
      <td className={TD_NUM}>{row.surveys}</td>
      <td className={TD_NUM}>{row.won}</td>
      <td className={TD_NUM}>{formatRatio(row.leadToWon)}</td>
      <td className={`${TD_NUM} whitespace-nowrap`}>{row.nilai > 0 ? formatIDR(row.nilai) : "—"}</td>
      <td className={TD_NUM}>{formatRatio(row.porsiNilai)}</td>
    </tr>
  );
}

export function SourcesTab({ rows, ask, loading }: Props) {
  if (loading) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>;

  const top = [...rows].sort((a, b) => b.nilai - a.nilai)[0];

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        {top && top.nilai > 0 ? `${top.source} menyumbang nilai terbesar, ${formatRatio(top.porsiNilai)} dari total deal` : "Belum ada deal dari sumber mana pun"}
      </p>
      <div className="bg-white rounded-md border border-line overflow-x-auto">
        <table className="w-full min-w-[680px] text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">Sumber</th>
              <th className={TH_RIGHT}>Lead</th>
              <th className={TH_RIGHT}>Survey</th>
              <th className={TH_RIGHT}>Deal Won</th>
              <th className={TH_RIGHT}>Lead ke Deal Won</th>
              <th className={TH_RIGHT}>Nilai Deal</th>
              <th className={TH_RIGHT}>Porsi Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <Fragment key={row.source}>
                <Row row={row} label={row.source} />
                {row.source === "Referral" && <Row row={ask} label="dari PT ASK" nested />}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-faint">Baris PT ASK adalah bagian dari Referral, dihitung dari kolom Direkomendasikan oleh.</p>
    </div>
  );
}
