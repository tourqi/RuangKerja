// Dashboard aktif: V2 (laporan manajerial berbasis grafik).
// Versi lama tetap tersedia di "@/features/dashboard/DashboardV1" bila perlu dikembalikan.
import DashboardV2 from "@/features/dashboard/DashboardV2";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Gambaran keuangan, proyek, dan penjualan studio</p>
      </div>
      <DashboardV2 />
    </div>
  );
}
