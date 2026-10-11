import ClientsTable from "@/features/clients/ClientsTable";

export default function ClientsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Clients</h1>
        <p className="text-sm text-muted mt-1">Kelola data dan informasi client Anda</p>
      </div>
      <ClientsTable />
    </div>
  );
}
