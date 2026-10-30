"use client";
import { useState, type SyntheticEvent } from "react";
import type { Project } from "@/types/db";
import { updateProject } from "@/services/projects";
import { useToast } from "@/components/Toast";
import { NumberInput } from "@/components/NumberInput";
import { DialogA11y } from "@/components/DialogA11y";
import { DEFAULT_GARANSI_BULAN, localToday } from "@/utils/warranty";

type Props = {
  project: Project;
  onSaved: () => void;
  onClose: () => void;
};

const INPUT_CLASS = "w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25";

export function BastDateModal({ project, onSaved, onClose }: Props) {
  const toast = useToast();
  const [bastDate, setBastDate] = useState(project.bast_date ?? localToday());
  const [garansiBulan, setGaransiBulan] = useState<number | undefined>(project.garansi_bulan ?? DEFAULT_GARANSI_BULAN);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bastDate) {
      toast("Isi tanggal BAST", "warning");
      return;
    }
    setSaving(true);
    try {
      await updateProject(project.id, { bast_date: bastDate, garansi_bulan: garansiBulan ?? DEFAULT_GARANSI_BULAN });
      toast("Tanggal BAST disimpan", "success");
      onSaved();
    } catch (err: unknown) {
      toast(`Gagal menyimpan tanggal BAST: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm">
        <DialogA11y onClose={onClose} />
        <div className="px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Tanggal BAST</h2>
          <p className="text-[13px] text-muted mt-0.5">{project.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="bast-date" className="block text-sm font-medium text-ink mb-1">Tanggal BAST</label>
            <input id="bast-date" type="date" value={bastDate} onChange={(e) => setBastDate(e.target.value)} className={INPUT_CLASS} />
            <p className="text-xs text-faint mt-1">Follow-up yang lewat lebih dari 30 hari otomatis dilewati.</p>
          </div>
          <div>
            <label htmlFor="bast-garansi" className="block text-sm font-medium text-ink mb-1">Masa Garansi (bulan)</label>
            <NumberInput
              id="bast-garansi"
              value={garansiBulan ?? ""}
              onValueChange={(v) => setGaransiBulan(v === "" ? undefined : Number(v))}
              className={INPUT_CLASS}
            />
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
