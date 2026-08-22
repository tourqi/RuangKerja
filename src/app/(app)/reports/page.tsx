import ReportsOverview from "@/features/reports/ReportsOverview";

export const metadata = { title: "Laporan – Interior ERP" };

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analisis bisnis berdasarkan data klien, lead, dan proyek</p>
      </div>
      <ReportsOverview />
    </div>
  );
}
