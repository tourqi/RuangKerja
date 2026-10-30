import type { Project, WarrantyFollowup } from "@/types/db";

export const DEFAULT_GARANSI_BULAN = 3;

/** Tanggal hari ini (YYYY-MM-DD) di zona lokal, bukan UTC. */
export function localToday(now = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Tambah bulan dan pepet ke akhir bulan, sama seperti date + interval di Postgres. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, lastDay));
  return first.toISOString().slice(0, 10);
}

export function warrantyEnd(project: Pick<Project, "bast_date" | "garansi_bulan">): string | null {
  if (!project.bast_date) return null;
  return addMonths(project.bast_date, project.garansi_bulan ?? DEFAULT_GARANSI_BULAN);
}

export function isUnderWarranty(project: Pick<Project, "bast_date" | "garansi_bulan">, today: string): boolean {
  const end = warrantyEnd(project);
  return !!end && today <= end;
}

export function isFollowupLate(followup: Pick<WarrantyFollowup, "due_date" | "status">, today: string): boolean {
  return followup.status === "pending" && followup.due_date.slice(0, 10) < today;
}

export interface WarrantyGroups {
  late: WarrantyFollowup[];
  thisMonth: WarrantyFollowup[];
  upcoming: WarrantyFollowup[];
}

/** Hanya follow-up pending. Proyek yang dihentikan atau sudah terhapus tidak ikut. */
export function groupWarrantyFollowups(followups: WarrantyFollowup[], projects: Project[], today: string): WarrantyGroups {
  const active = new Set(projects.filter((p) => !p.followup_dihentikan).map((p) => p.id));
  const monthEnd = `${today.slice(0, 7)}-31`;
  const groups: WarrantyGroups = { late: [], thisMonth: [], upcoming: [] };
  for (const followup of followups) {
    if (followup.status !== "pending" || !active.has(followup.project_id)) continue;
    const due = followup.due_date.slice(0, 10);
    if (due < today) groups.late.push(followup);
    else if (due <= monthEnd) groups.thisMonth.push(followup);
    else groups.upcoming.push(followup);
  }
  return groups;
}

/** Project Selesai tanpa tanggal BAST, belum bisa dijadwalkan follow-up-nya. */
export function projectsWithoutBast(projects: Project[]): Project[] {
  return projects.filter((p) => p.status === "Done" && !p.bast_date);
}
