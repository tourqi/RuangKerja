"use client";
import { useState } from "react";
import type { Client, Project, WarrantyFollowup } from "@/types/db";
import { updateProject } from "@/services/projects";
import { skipWarrantyFollowup } from "@/services/warranty";
import { useWarrantyFollowups } from "@/hooks/useWarranty";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/Toast";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { StatusDot, WARRANTY_STATUS_TONE } from "@/components/ui/StatusDot";
import { WARRANTY_KONDISI_LABELS, WARRANTY_STATUS_LABELS, WARRANTY_TUGAS } from "@/constants/options";
import { formatDate } from "@/utils/format";
import { isFollowupLate, isUnderWarranty, localToday, warrantyEnd } from "@/utils/warranty";
import { BastDateModal } from "./BastDateModal";
import { FollowupResultModal } from "./FollowupResultModal";

type Props = {
  project: Project;
  client?: Client;
  onChanged: () => void;
};

const SECONDARY_BUTTON = "px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors";

export function ProjectWarrantyTab({ project, client, onChanged }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const { followups, loading, refetch } = useWarrantyFollowups();
  const [recording, setRecording] = useState<WarrantyFollowup | null>(null);
  const [editingBast, setEditingBast] = useState(false);

  const today = localToday();
  const rows = followups
    .filter((f) => f.project_id === project.id && !(f.status === "skipped" && !f.done_at))
    .sort((a, b) => a.bulan_ke - b.bulan_ke);

  async function handleSkip(followup: WarrantyFollowup) {
    if (!(await confirm({ title: "Lewati follow-up?", description: `Follow-up bulan ke-${followup.bulan_ke} ditandai dilewati.` }))) return;
    try {
      await skipWarrantyFollowup(followup);
      await refetch();
      toast("Follow-up dilewati", "success");
    } catch (err: unknown) {
      toast(`Gagal melewati follow-up: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
    }
  }

  async function handleToggleStop() {
    const stop = !project.followup_dihentikan;
    if (stop && !(await confirm({ title: "Hentikan follow-up?", description: "Project ini tidak lagi muncul di daftar follow-up dan tidak mendapat pengingat." }))) return;
    try {
      await updateProject(project.id, { followup_dihentikan: stop });
      onChanged();
      await refetch();
      toast(stop ? "Follow-up dihentikan" : "Follow-up dilanjutkan", "success");
    } catch (err: unknown) {
      toast(`Gagal mengubah follow-up: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
    }
  }

  const bastModal = editingBast && (
    <BastDateModal
      project={project}
      onSaved={() => { setEditingBast(false); onChanged(); refetch(); }}
      onClose={() => setEditingBast(false)}
    />
  );

  if (!project.bast_date) {
    return (
      <div className="bg-white rounded-md border border-line p-10 text-center space-y-3">
        <p className="text-sm text-faint">
          {project.status === "Done" ? "Project ini belum punya tanggal BAST, jadi jadwal follow-up belum dibuat." : "Jadwal follow-up dibuat saat project Selesai dan tanggal BAST terisi."}
        </p>
        {project.status === "Done" && <button onClick={() => setEditingBast(true)} className={SECONDARY_BUTTON}>Isi tanggal BAST</button>}
        {bastModal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted">
          <span>BAST <span className="text-ink font-medium">{formatDate(project.bast_date)}</span></span>
          <span>
            Garansi sampai <span className="text-ink font-medium">{formatDate(warrantyEnd(project))}</span>
            {!isUnderWarranty(project, today) && " · habis"}
          </span>
          {project.followup_dihentikan && <span className="text-warning font-medium">Follow-up dihentikan</span>}
        </div>
        <div className="flex items-center gap-2">
          <WhatsAppLink phone={client?.phone} variant="button" />
          <button onClick={() => setEditingBast(true)} className={SECONDARY_BUTTON}>Ubah BAST</button>
          <button onClick={handleToggleStop} className={SECONDARY_BUTTON}>
            {project.followup_dihentikan ? "Lanjutkan follow-up" : "Hentikan follow-up"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-md border border-line overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-sm text-faint">Memuat data...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-faint">Belum ada jadwal follow-up.</div>
        ) : (
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Follow-up</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Jatuh tempo</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Status</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Hasil</th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((followup) => {
                const late = isFollowupLate(followup, today);
                const tugas = WARRANTY_TUGAS[followup.bulan_ke];
                return (
                  <tr key={followup.id}>
                    <td className="px-3 py-2 text-ink whitespace-nowrap">Bulan ke-{followup.bulan_ke}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${late ? "text-danger font-medium" : "text-muted"}`}>{formatDate(followup.due_date)}</td>
                    <td className="px-3 py-2">
                      <StatusDot tone={late ? "danger" : WARRANTY_STATUS_TONE[followup.status]}>
                        {late ? "Telat" : WARRANTY_STATUS_LABELS[followup.status]}
                      </StatusDot>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {followup.kondisi ? WARRANTY_KONDISI_LABELS[followup.kondisi] : "—"}
                      {followup.tugas_selesai && tugas && ` · ${tugas}`}
                      {followup.catatan && <p className="text-xs text-faint">{followup.catatan}</p>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {followup.status === "pending" && !project.followup_dihentikan && (
                        <>
                          <button onClick={() => setRecording(followup)} className="text-accent font-medium hover:underline">Catat hasil</button>
                          <button onClick={() => handleSkip(followup)} className="ml-3 text-muted hover:text-ink">Lewati</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {recording && (
        <FollowupResultModal
          followup={recording}
          project={project}
          client={client}
          onSaved={() => { setRecording(null); refetch(); }}
          onClose={() => setRecording(null)}
        />
      )}
      {bastModal}
    </div>
  );
}
