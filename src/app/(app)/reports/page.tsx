import ReportsOverview from "@/features/reports/ReportsOverview";

export const metadata = { title: "Laporan – Interior ERP" };

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Laporan</h1>
        <p className="text-sm text-muted mt-0.5">Analisis bisnis berdasarkan data klien, lead, dan proyek</p>
      </div>
      <ReportsOverview />
    </div>
  );
}
