import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';
import { useProjects } from '@/hooks/useProjects';

export default function DashboardOverview() {
  const { clients, loading: loadingClients } = useClients();
  const { leads, loading: loadingLeads } = useLeads();
  const { projects, loading: loadingProjects } = useProjects();

  if (loadingClients || loadingLeads || loadingProjects) return <div>Loading...</div>;

  const leadStatusCount = (status: string) => leads.filter(l => l.status === status).length;
  const projectStatusCount = (status: string) => projects.filter(p => p.status === status).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Clients</h2>
        <div className="text-3xl font-bold">{clients.length}</div>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Leads</h2>
        <div className="flex flex-col gap-1">
          <div>New: <span className="font-bold">{leadStatusCount('New Lead')}</span></div>
          <div>Contacted: <span className="font-bold">{leadStatusCount('Contacted')}</span></div>
          <div>Survey: <span className="font-bold">{leadStatusCount('Survey')}</span></div>
          <div>Deal: <span className="font-bold">{leadStatusCount('Deal')}</span></div>
          <div>Lost: <span className="font-bold">{leadStatusCount('Lost')}</span></div>
        </div>
      </div>
      <div className="bg-white rounded shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Projects</h2>
        <div className="flex flex-col gap-1">
          <div>Design: <span className="font-bold">{projectStatusCount('Design')}</span></div>
          <div>Production: <span className="font-bold">{projectStatusCount('Production')}</span></div>
          <div>Installation: <span className="font-bold">{projectStatusCount('Installation')}</span></div>
          <div>Done: <span className="font-bold">{projectStatusCount('Done')}</span></div>
        </div>
      </div>
    </div>
  );
}
