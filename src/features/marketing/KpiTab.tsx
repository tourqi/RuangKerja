"use client";
import { useState, type SyntheticEvent } from "react";
import { saveMarketingKpi } from "@/services/marketing";
import { DialogA11y } from "@/components/DialogA11y";
import { NumberInput } from "@/components/NumberInput";
import { useToast } from "@/components/Toast";
import { MARKETING_TARGETS } from "@/constants/options";
import { formatIDR } from "@/utils/format";
import type { KpiRow } from "@/utils/marketingCalculations";
import { formatMonth, formatRatio } from "./format";

type Props = {
  rows: KpiRow[];
  loading: boolean;
  onSaved: () => void;
};

const TH_RIGHT = "text-right px-3 py-2 text-xs font-medium text-muted whitespace-nowrap";
const TD_NUM = "px-3 py-2 text-right font-mono text-ink whitespace-nowrap";
const INPUT_CLASS = "w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25";

const money = (value: number | null) => (value == null ? "—" : formatIDR(value));

function KpiFormModal({ row, onSaved, onClose }: { row: KpiRow; onSaved: () => void; onClose: () => void }) {
  const toast = useToast();
  const [review, setReview] = useState<number | null>(row.reviewTotal);
  const [budget, setBudget] = useState<number | null>(row.budgetIklan);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveMarketingKpi({ bulan: `${row.month}-01`, review_google_total: review, budget_iklan: budget });
      toast("KPI bulan ini disimpan", "success");
      onSaved();
    } catch (err: unknown) {
      toast(`Gagal menyimpan KPI: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm">
        <DialogA11y onClose={onClose} />
        <div className="px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">KPI {formatMonth(row.month)}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="kpi-review" className="block text-sm font-medium text-ink mb-1">Total review Google</label>
            <NumberInput id="kpi-review" value={review ?? ""} onValueChange={(v) => setReview(v === "" ? null : Number(v))} className={INPUT_CLASS} />
            <p className="text-xs text-faint mt-1">Isi jumlah total di Google Maps pada akhir bulan.</p>
          </div>
          <div>
            <label htmlFor="kpi-budget" className="block text-sm font-medium text-ink mb-1">Budget iklan</label>
            <NumberInput id="kpi-budget" value={budget ?? ""} onValueChange={(v) => setBudget(v === "" ? null : Number(v))} placeholder="Rp" className={INPUT_CLASS} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button type="button" className="px-6 py-2 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function KpiTab({ rows, loading, onSaved }: Props) {
  const [editing, setEditing] = useState<KpiRow | null>(null);

  if (loading) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>;

  const latestReview = rows.find((row) => row.reviewTotal != null)?.reviewTotal ?? MARKETING_TARGETS.reviewAwal;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">
        Review Google {latestReview} dari target {MARKETING_TARGETS.reviewTarget}. Porsi ASK ditandai kalau lewat {formatRatio(MARKETING_TARGETS.batasPorsiAsk)}.
      </p>
      <div className="bg-white rounded-md border border-line overflow-x-auto">
        <table className="w-full min-w-[920px] text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">Bulan</th>
              <th className={TH_RIGHT}>Omzet</th>
              <th className={TH_RIGHT}>Omzet ASK</th>
              <th className={TH_RIGHT}>Porsi ASK</th>
              <th className={TH_RIGHT}>Review</th>
              <th className={TH_RIGHT}>Review baru</th>
              <th className={TH_RIGHT}>Budget iklan</th>
              <th className={TH_RIGHT}>Lead iklan</th>
              <th className={TH_RIGHT}>Biaya per lead</th>
              <th className="w-14"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const overAsk = row.porsiAsk != null && row.porsiAsk > MARKETING_TARGETS.batasPorsiAsk;
              return (
                <tr key={row.month} className="hover:bg-hover transition-colors">
                  <td className="px-3 py-2 text-ink whitespace-nowrap">{formatMonth(row.month)}</td>
                  <td className={TD_NUM}>{row.omzet > 0 ? formatIDR(row.omzet) : "—"}</td>
                  <td className={TD_NUM}>{row.omzetAsk > 0 ? formatIDR(row.omzetAsk) : "—"}</td>
                  <td className={`${TD_NUM} ${overAsk ? "text-danger font-medium" : ""}`}>
                    {formatRatio(row.porsiAsk)}{overAsk && " · lewat batas"}
                  </td>
                  <td className={TD_NUM}>{row.reviewTotal ?? "—"}</td>
                  <td className={TD_NUM}>{row.reviewBaru ?? "—"}</td>
                  <td className={TD_NUM}>{money(row.budgetIklan)}</td>
                  <td className={TD_NUM}>{row.leadIklan}</td>
                  <td className={TD_NUM}>{money(row.biayaPerLead)}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(row)} aria-label={`Isi KPI ${formatMonth(row.month)}`} className="text-accent font-medium hover:underline">Isi</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <KpiFormModal
          row={editing}
          onSaved={() => { setEditing(null); onSaved(); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
