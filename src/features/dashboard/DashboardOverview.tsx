"use client";
import { useClients } from '@/hooks/useClients';
import { useLeads } from '@/hooks/useLeads';
import { useProjects } from '@/hooks/useProjects';

export default function DashboardOverview() {
  const { clients, loading: loadingClients } = useClients();
  const { leads, loading: loadingLeads } = useLeads();
  const { projects, loading: loadingProjects } = useProjects();

  if (loadingClients || loadingLeads || loadingProjects) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  const leadStatusCount = (status: string) => leads.filter(l => l.status === status).length;
  const projectStatusCount = (status: string) => projects.filter(p => p.status === status).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clients Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Clients</p>
              <p className="text-4xl font-bold">{clients.length}</p>
            </div>
            <div className="text-5xl opacity-30">👥</div>
          </div>
        </div>

        {/* Leads Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="mb-4">
            <p className="text-purple-100 text-sm font-medium mb-1">Leads Pipeline</p>
            <p className="text-4xl font-bold">{leads.length}</p>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{leadStatusCount('New Lead')}</div>
              <div className="text-purple-100">New</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{leadStatusCount('Contacted')}</div>
              <div className="text-purple-100">Contact</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{leadStatusCount('Survey')}</div>
              <div className="text-purple-100">Survey</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{leadStatusCount('Deal')}</div>
              <div className="text-purple-100">Deal</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{leadStatusCount('Lost')}</div>
              <div className="text-purple-100">Lost</div>
            </div>
          </div>
        </div>

        {/* Projects Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <div className="mb-4">
            <p className="text-green-100 text-sm font-medium mb-1">Active Projects</p>
            <p className="text-4xl font-bold">{projects.length}</p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{projectStatusCount('Design')}</div>
              <div className="text-green-100">Design</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{projectStatusCount('Production')}</div>
              <div className="text-green-100">Production</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{projectStatusCount('Installation')}</div>
              <div className="text-green-100">Install</div>
            </div>
            <div className="bg-white/20 rounded p-2 text-center">
              <div className="font-bold">{projectStatusCount('Done')}</div>
              <div className="text-green-100">Done</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
