import DashboardOverview from "@/features/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan data bisnis interior Anda</p>
      </div>
      <DashboardOverview />
    </div>
  );
}
