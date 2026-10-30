"use client";
import Link from "next/link";
import { useState } from "react";
import type { Project, WarrantyFollowup } from "@/types/db";
import { skipWarrantyFollowup } from "@/services/warranty";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useWarrantyFollowups } from "@/hooks/useWarranty";
import { ActionDropdown } from "@/components/ActionDropdown";
import { CheckCircleIcon, ClockIcon } from "@/components/icons/AppIcons";
import { useConfirm } from "@/components/ConfirmProvider";
import { DetailTabs, useTabParam } from "@/components/DetailTabs";
import { MobileCard, MobileCardHeader, MobileCardList, MobileCardRow } from "@/components/MobileCard";
import { useToast } from "@/components/Toast";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { WARRANTY_TUGAS } from "@/constants/options";
import { formatDate } from "@/utils/format";
import { groupWarrantyFollowups, isFollowupLate, isUnderWarranty, localToday, projectsWithoutBast, warrantyEnd } from "@/utils/warranty";
import { BastDateModal } from "./BastDateModal";
import { FollowupResultModal } from "./FollowupResultModal";

const TAB_KEYS = ["perlu", "mendatang", "proyek", "belum-bast"] as const;

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="bg-white px-4 py-3 flex-1 min-w-[130px]">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono text-base font-medium mt-0.5 ${danger ? "text-danger" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export default function GaransiPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { projects, loading: loadingProjects, refetch: refetchProjects } = useProjects();
  const { clients, loading: loadingClients } = useClients();
  const { followups, loading: loadingFollowups, refetch } = useWarrantyFollowups();
  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, "perlu");
  const [recording, setRecording] = useState<WarrantyFollowup | null>(null);
  const [bastProject, setBastProject] = useState<Project | null>(null);

  const loading = loadingProjects || loadingClients || loadingFollowups;
  const today = localToday();
  const groups = groupWarrantyFollowups(followups, projects, today);
  const needed = [...groups.late, ...groups.thisMonth];
  const missingBast = projectsWithoutBast(projects);
  const bastProjects = projects.filter((p) => p.bast_date);
  const underWarranty = bastProjects.filter((p) => isUnderWarranty(p, today));

  const projectOf = (id: string) => projects.find((p) => p.id === id);
  const clientOf = (project?: Project) => clients.find((c) => c.id === project?.client_id);

  async function handleSkip(followup: WarrantyFollowup) {
    if (!(await confirm({ title: "Lewati follow-up?", description: `Follow-up bulan ke-${followup.bulan_ke} ditandai dilewati dan hilang dari daftar.` }))) return;
    try {
      await skipWarrantyFollowup(followup);
      await refetch();
      toast("Follow-up dilewati", "success");
    } catch (err: unknown) {
      toast(`Gagal melewati follow-up: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
    }
  }

  function renderFollowups(rows: WarrantyFollowup[], emptyMessage: string) {
    if (loading) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>;
    if (rows.length === 0) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">{emptyMessage}</div>;
    return (
      <>
        <div className="hidden sm:block bg-white rounded-md border border-line overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted w-10"><span className="sr-only">Aksi</span></th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Klien</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Project</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Follow-up</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Jatuh tempo</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Garansi sampai</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted">Tugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((followup) => {
                const project = projectOf(followup.project_id);
                const client = clientOf(project);
                const late = isFollowupLate(followup, today);
                return (
                  <tr key={followup.id} className="hover:bg-hover transition-colors">
                    <td className="px-3 py-2">
                      <ActionDropdown
                        align="left"
                        items={[
                          { key: "catat", label: "Catat hasil", icon: <CheckCircleIcon />, onClick: () => setRecording(followup) },
                          { key: "lewati", label: "Lewati", icon: <ClockIcon />, onClick: () => handleSkip(followup) },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="text-ink font-medium">{client?.name ?? "—"}</span>
                        <WhatsAppLink phone={client?.phone} />
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/projects/${followup.project_id}?tab=garansi`} className="text-ink hover:underline">{project?.name ?? "—"}</Link>
                    </td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">Bulan ke-{followup.bulan_ke}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${late ? "text-danger font-medium" : "text-muted"}`}>
                      {formatDate(followup.due_date)}{late && " · telat"}
                    </td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{project ? formatDate(warrantyEnd(project)) : "—"}</td>
                    <td className="px-3 py-2 text-muted">{WARRANTY_TUGAS[followup.bulan_ke] ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <MobileCardList>
          {rows.map((followup) => {
            const project = projectOf(followup.project_id);
            const client = clientOf(project);
            const late = isFollowupLate(followup, today);
            return (
              <MobileCard key={followup.id}>
                <MobileCardHeader
                  title={client?.name ?? "—"}
                  subtitle={<span className="text-xs text-faint">{project?.name ?? "—"}</span>}
                  actions={<WhatsAppLink phone={client?.phone} />}
                />
                <MobileCardRow label="Follow-up">Bulan ke-{followup.bulan_ke}</MobileCardRow>
                <MobileCardRow label="Jatuh tempo">
                  <span className={late ? "text-danger" : ""}>{formatDate(followup.due_date)}{late && " · telat"}</span>
                </MobileCardRow>
                <MobileCardRow label="Tugas">{WARRANTY_TUGAS[followup.bulan_ke] ?? "—"}</MobileCardRow>
                <div className="flex gap-2 pt-3">
                  <button onClick={() => setRecording(followup)} className="px-2.5 py-1.5 bg-accent text-white rounded-md text-[13px] font-medium">Catat hasil</button>
                  <button onClick={() => handleSkip(followup)} className="px-2.5 py-1.5 border border-line bg-white text-ink rounded-md text-[13px] font-medium">Lewati</button>
                </div>
              </MobileCard>
            );
          })}
        </MobileCardList>
      </>
    );
  }

  function renderProjects() {
    if (loading) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>;
    if (bastProjects.length === 0) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Belum ada project dengan tanggal BAST.</div>;
    return (
      <div className="bg-white rounded-md border border-line overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">Project</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">Klien</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">BAST</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">Garansi sampai</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted">Follow-up berikutnya</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {bastProjects.map((project) => {
              const next = followups.find((f) => f.project_id === project.id && f.status === "pending");
              const inWarranty = isUnderWarranty(project, today);
              return (
                <tr key={project.id} className="hover:bg-hover transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/projects/${project.id}?tab=garansi`} className="text-ink font-medium hover:underline">{project.name}</Link>
                  </td>
                  <td className="px-3 py-2 text-muted">{clientOf(project)?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">{formatDate(project.bast_date)}</td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">
                    {formatDate(warrantyEnd(project))}{!inWarranty && " · habis"}
                  </td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap">
                    {project.followup_dihentikan ? "Dihentikan" : next ? `${formatDate(next.due_date)} · bulan ke-${next.bulan_ke}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderMissingBast() {
    if (loading) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Memuat data...</div>;
    if (missingBast.length === 0) return <div className="p-10 text-center text-sm text-faint bg-white rounded-md border border-line">Semua project Selesai sudah punya tanggal BAST.</div>;
    return (
      <div className="bg-white rounded-md border border-line divide-y divide-line">
        {missingBast.map((project) => (
          <div key={project.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-[13px]">
            <span className="min-w-0">
              <Link href={`/projects/${project.id}`} className="text-ink font-medium hover:underline">{project.name}</Link>
              <span className="text-faint"> · {clientOf(project)?.name ?? "—"}</span>
            </span>
            <button
              onClick={() => setBastProject(project)}
              className="px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors shrink-0"
            >
              Isi tanggal BAST
            </button>
          </div>
        ))}
      </div>
    );
  }

  const recordingProject = recording ? projectOf(recording.project_id) : undefined;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Masa Garansi</h1>
        <p className="text-[13px] text-muted mt-0.5">
          {needed.length > 0
            ? `${needed.length} follow-up perlu dikerjakan${groups.late.length > 0 ? `, ${groups.late.length} sudah telat` : " bulan ini"}`
            : "Tidak ada follow-up yang perlu dikerjakan bulan ini"}
        </p>
      </div>

      <div className="flex flex-wrap gap-px bg-line border border-line rounded-md overflow-hidden">
        <Stat label="Telat" value={groups.late.length} danger={groups.late.length > 0} />
        <Stat label="Jatuh tempo bulan ini" value={groups.thisMonth.length} />
        <Stat label="Masih bergaransi" value={underWarranty.length} />
        <Stat label="Belum ada BAST" value={missingBast.length} />
      </div>

      <DetailTabs
        tabs={[
          { key: "perlu", label: "Perlu Follow-up", count: needed.length },
          { key: "mendatang", label: "Mendatang", count: groups.upcoming.length },
          { key: "proyek", label: "Semua Proyek", count: bastProjects.length },
          { key: "belum-bast", label: "Belum ada BAST", count: missingBast.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "perlu" && renderFollowups(needed, "Tidak ada follow-up yang telat atau jatuh tempo bulan ini.")}
      {activeTab === "mendatang" && renderFollowups(groups.upcoming, "Belum ada jadwal follow-up berikutnya.")}
      {activeTab === "proyek" && renderProjects()}
      {activeTab === "belum-bast" && renderMissingBast()}

      {recording && recordingProject && (
        <FollowupResultModal
          followup={recording}
          project={recordingProject}
          client={clientOf(recordingProject)}
          onSaved={() => { setRecording(null); refetch(); }}
          onClose={() => setRecording(null)}
        />
      )}
      {bastProject && (
        <BastDateModal
          project={bastProject}
          onSaved={() => { setBastProject(null); refetchProjects(); refetch(); }}
          onClose={() => setBastProject(null)}
        />
      )}
    </div>
  );
}
