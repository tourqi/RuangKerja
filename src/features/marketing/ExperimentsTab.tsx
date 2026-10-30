"use client";
import { useState, type ChangeEvent, type SyntheticEvent } from "react";
import type { ExperimentStatus, MarketingExperiment } from "@/types/db";
import { addExperiment, deleteExperiment, updateExperiment } from "@/services/marketing";
import { useExperiments } from "@/hooks/useMarketing";
import { ActionDropdown } from "@/components/ActionDropdown";
import { useConfirm } from "@/components/ConfirmProvider";
import { DialogA11y } from "@/components/DialogA11y";
import { MobileCard, MobileCardHeader, MobileCardIconButton, MobileCardList, MobileCardRow, PencilIcon, TrashIcon } from "@/components/MobileCard";
import { Select } from "@/components/Select";
import { useToast } from "@/components/Toast";
import { StatusDot, EXPERIMENT_STATUS_TONE } from "@/components/ui/StatusDot";
import { EXPERIMENT_STATUSES, toOptions } from "@/constants/options";
import { formatDate } from "@/utils/format";

const INPUT_CLASS = "w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25";
const LABEL_CLASS = "block text-sm font-medium text-ink mb-1";

const TEXT_COLUMNS = ["hipotesis", "cara_uji", "metrik", "baseline", "hasil", "mulai", "batas_evaluasi", "keputusan"] as const;

function ExperimentFormModal({ experiment, onSaved, onClose }: { experiment: MarketingExperiment | null; onSaved: () => void; onClose: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Partial<MarketingExperiment>>(experiment ?? { status: "Belum mulai" });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const nama = form.nama?.trim();
    if (!nama) {
      toast("Isi nama eksperimen", "warning");
      return;
    }
    const payload = {
      ...Object.fromEntries(TEXT_COLUMNS.map((k) => [k, form[k]?.trim() || null])),
      nama,
      status: form.status ?? "Belum mulai",
    } as unknown as Omit<MarketingExperiment, "id" | "created_at">;
    setSaving(true);
    try {
      if (experiment) await updateExperiment(experiment.id, payload);
      else await addExperiment(payload);
      toast("Eksperimen disimpan", "success");
      onSaved();
    } catch (err: unknown) {
      const pg = err as { code?: string; message?: string };
      const message = pg.code === "23505" ? `Eksperimen "${nama}" sudah ada, pakai nama lain.` : pg.message || "periksa koneksi lalu coba lagi";
      toast(`Gagal menyimpan eksperimen: ${message}`, "error");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogA11y onClose={onClose} />
        <div className="px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">{experiment ? "Edit Eksperimen" : "Tambah Eksperimen"}</h2>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="experiment-nama" className={LABEL_CLASS}>Nama <span className="text-danger">*</span></label>
              <input id="experiment-nama" name="nama" value={form.nama || ""} onChange={handleChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="experiment-status" className={LABEL_CLASS}>Status</label>
              <Select id="experiment-status" value={form.status || "Belum mulai"} onChange={(v) => setForm((prev) => ({ ...prev, status: v as ExperimentStatus }))} options={toOptions(EXPERIMENT_STATUSES)} includeEmptyOption={false} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="experiment-hipotesis" className={LABEL_CLASS}>Hipotesis</label>
              <textarea id="experiment-hipotesis" name="hipotesis" value={form.hipotesis || ""} onChange={handleChange} rows={2} className={`${INPUT_CLASS} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="experiment-cara-uji" className={LABEL_CLASS}>Cara Uji</label>
              <textarea id="experiment-cara-uji" name="cara_uji" value={form.cara_uji || ""} onChange={handleChange} rows={2} className={`${INPUT_CLASS} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="experiment-metrik" className={LABEL_CLASS}>Metrik</label>
              <input id="experiment-metrik" name="metrik" value={form.metrik || ""} onChange={handleChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="experiment-baseline" className={LABEL_CLASS}>Baseline</label>
              <input id="experiment-baseline" name="baseline" value={form.baseline || ""} onChange={handleChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="experiment-hasil" className={LABEL_CLASS}>Hasil</label>
              <input id="experiment-hasil" name="hasil" value={form.hasil || ""} onChange={handleChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="experiment-mulai" className={LABEL_CLASS}>Mulai</label>
              <input id="experiment-mulai" type="date" name="mulai" value={form.mulai || ""} onChange={handleChange} className={INPUT_CLASS} />
            </div>
            <div>
              <label htmlFor="experiment-batas" className={LABEL_CLASS}>Batas Evaluasi</label>
              <input id="experiment-batas" name="batas_evaluasi" value={form.batas_evaluasi || ""} onChange={handleChange} placeholder="2 bulan" className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="experiment-keputusan" className={LABEL_CLASS}>Keputusan</label>
              <input id="experiment-keputusan" name="keputusan" value={form.keputusan || ""} onChange={handleChange} placeholder="Lanjut, ubah, atau stop" className={INPUT_CLASS} />
            </div>
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

export function ExperimentsTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const { experiments, loading, refetch } = useExperiments();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingExperiment | null>(null);

  function openForm(experiment: MarketingExperiment | null) {
    setEditing(experiment);
    setModalOpen(true);
  }

  async function handleDelete(experiment: MarketingExperiment) {
    if (!(await confirm({ title: "Hapus eksperimen?", description: `${experiment.nama} akan dihapus permanen.` }))) return;
    try {
      await deleteExperiment(experiment.id);
      await refetch();
      toast("Eksperimen dihapus", "success");
    } catch (err: unknown) {
      toast(`Gagal menghapus eksperimen: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
    }
  }

  const running = experiments.filter((e) => e.status === "Berjalan").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{experiments.length} eksperimen, {running} berjalan</p>
        <button onClick={() => openForm(null)} className="px-2.5 py-1.5 bg-accent text-white rounded-md text-[13px] font-medium hover:bg-accent-hover transition">
          Tambah Eksperimen
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>
      ) : experiments.length === 0 ? (
        <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Belum ada eksperimen. Klik &quot;Tambah Eksperimen&quot; untuk mulai.</div>
      ) : (
        <>
          <div className="hidden sm:block bg-white rounded-md border border-line overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted w-10"><span className="sr-only">Aksi</span></th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Eksperimen</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Metrik</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Baseline</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Hasil</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Mulai</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Batas</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Status</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {experiments.map((experiment) => (
                  <tr key={experiment.id} className="hover:bg-hover transition-colors align-top">
                    <td className="px-3 py-2">
                      <ActionDropdown
                        align="left"
                        items={[
                          { key: "edit", label: "Edit", icon: <PencilIcon />, onClick: () => openForm(experiment) },
                          { key: "delete", label: "Hapus", danger: true, icon: <TrashIcon />, onClick: () => handleDelete(experiment) },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2 max-w-[260px]">
                      <p className="text-ink font-medium">{experiment.nama}</p>
                      {experiment.hipotesis && <p className="text-xs text-faint">{experiment.hipotesis}</p>}
                    </td>
                    <td className="px-3 py-2 text-muted max-w-[200px]">{experiment.metrik ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">{experiment.baseline ?? "—"}</td>
                    <td className="px-3 py-2 text-muted">{experiment.hasil ?? "—"}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(experiment.mulai)}</td>
                    <td className="px-3 py-2 text-muted">{experiment.batas_evaluasi ?? "—"}</td>
                    <td className="px-3 py-2"><StatusDot tone={EXPERIMENT_STATUS_TONE[experiment.status] ?? "neutral"}>{experiment.status}</StatusDot></td>
                    <td className="px-3 py-2 text-muted">{experiment.keputusan ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <MobileCardList>
            {experiments.map((experiment) => (
              <MobileCard key={experiment.id}>
                <MobileCardHeader
                  title={experiment.nama}
                  subtitle={experiment.hipotesis ? <span className="text-xs text-faint">{experiment.hipotesis}</span> : undefined}
                  actions={
                    <>
                      <MobileCardIconButton title="Edit" onClick={() => openForm(experiment)}><PencilIcon /></MobileCardIconButton>
                      <MobileCardIconButton title="Hapus" danger onClick={() => handleDelete(experiment)}><TrashIcon /></MobileCardIconButton>
                    </>
                  }
                />
                <MobileCardRow label="Metrik">{experiment.metrik ?? "—"}</MobileCardRow>
                <MobileCardRow label="Baseline">{experiment.baseline ?? "—"}</MobileCardRow>
                <MobileCardRow label="Hasil">{experiment.hasil ?? "—"}</MobileCardRow>
                <MobileCardRow label="Status">{experiment.status}</MobileCardRow>
                <MobileCardRow label="Keputusan">{experiment.keputusan ?? "—"}</MobileCardRow>
              </MobileCard>
            ))}
          </MobileCardList>
        </>
      )}

      {modalOpen && (
        <ExperimentFormModal
          experiment={editing}
          onSaved={() => { setModalOpen(false); refetch(); }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
