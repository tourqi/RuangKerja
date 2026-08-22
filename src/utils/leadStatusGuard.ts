import { Lead, LeadStatus } from "@/types/db";

/**
 * Status yang MEWAJIBKAN follow_up_date terisi (rule #1). Deal Won (transaksi
 * selesai) dan Deal Lost (opsional, kalau ada rencana re-engagement) sengaja
 * tidak diwajibkan. SLA "maks N hari" di rule #1 bukan validasi save/block —
 * itu domain auto-eskalasi/monitoring stale lead, bukan form ini.
 */
export const FOLLOW_UP_REQUIRED_STATUSES: LeadStatus[] = ["Contacted", "Survey", "Deal"];

/**
 * Cermin client-side dari guard_lead_status_transition() di
 * supabase/migrations/lead_state_machine.sql & lead_followup_date_guard.sql
 * — supaya user dapat feedback instan sebelum round-trip ke DB. DB trigger
 * tetap jadi sumber kebenaran (defense-in-depth), pesan di sini sengaja
 * dibuat sama.
 *
 * Pengecualian: syarat "minimal 1 record kontak" untuk New Lead → Contacted
 * tidak dicek di sini (butuh query lead_contacts) — itu diserahkan ke DB
 * guard, errornya akan muncul lewat toast dari response Supabase.
 */
export function getStatusTransitionError(target: Partial<Lead> & { status?: LeadStatus }): string | null {
  if (target.status && FOLLOW_UP_REQUIRED_STATUSES.includes(target.status) && !target.follow_up_date) {
    return `Tidak bisa pindah ke status ${target.status}: Follow Up Date wajib diisi.`;
  }
  switch (target.status) {
    case "Survey":
      if (!target.lokasi_survey?.trim()) {
        return "Tidak bisa pindah ke status Survey: lokasi/alamat survey wajib diisi.";
      }
      return null;
    case "Deal":
      if (target.budget == null || !target.project_name?.trim()) {
        return "Tidak bisa pindah ke status Deal: budget dan nama project wajib diisi.";
      }
      return null;
    case "Deal Won":
      if (!target.closed_at || target.nominal_deal == null) {
        return "Tidak bisa pindah ke status Deal Won: Closed At dan nominal deal wajib diisi.";
      }
      return null;
    case "Deal Lost":
      if (!target.alasan_lost?.trim()) {
        return "Tidak bisa pindah ke status Deal Lost: alasan/catatan lost wajib diisi.";
      }
      return null;
    default:
      return null;
  }
}
