import LeadsTable from "@/features/leads/LeadsTable";

export default function LeadsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Leads</h1>
        <p className="text-sm text-muted mt-1">Pantau dan kelola pipeline penjualan Anda</p>
      </div>
      <LeadsTable />
    </div>
  );
}
