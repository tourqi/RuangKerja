import ClientsTable from '@/features/clients/ClientsTable';

export default function ClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Clients</h1>
      <ClientsTable />
    </div>
  );
}
