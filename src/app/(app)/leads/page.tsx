import LeadsTable from "@/features/leads/LeadsTable";

export default function LeadsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">Pantau dan kelola pipeline penjualan Anda</p>
      </div>
      <LeadsTable />
    </div>
  );
}
