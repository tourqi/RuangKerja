import ClientsTable from "@/features/clients/ClientsTable";

export default function ClientsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola data dan informasi client Anda</p>
      </div>
      <ClientsTable />
    </div>
  );
}
