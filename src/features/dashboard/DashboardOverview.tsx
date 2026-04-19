"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import Link from "next/link";

const leadStatusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Survey: "bg-purple-100 text-purple-700",
  Deal: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};

const projectStatusColors: Record<string, string> = {
  Design: "bg-blue-100 text-blue-700",
  Production: "bg-yellow-100 text-yellow-700",
  Installation: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
};

const formatCurrency = (value?: number) => {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

export default function DashboardOverview() {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();

  const loading = lc || ll || lp;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  const leadCount = (s: string) => leads.filter((l) => l.status === s).length;
  const projectCount = (s: string) => projects.filter((p) => p.status === s).length;

  const dealWon = clients.filter((c) => c.lead_status === "Deal Won").length;
  const activeProjects = projects.filter((p) => p.status !== "Done").length;

  const recentClients = [...clients]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Client</p>
          <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-400 mt-1">{dealWon} deal won</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Lead</p>
          <p className="text-3xl font-bold text-gray-900">{leads.length}</p>
          <p className="text-xs text-gray-400 mt-1">{leadCount("Deal")} deal closing</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Project Aktif</p>
          <p className="text-3xl font-bold text-gray-900">{activeProjects}</p>
          <p className="text-xs text-gray-400 mt-1">{projectCount("Done")} selesai</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Project</p>
          <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
          <p className="text-xs text-gray-400 mt-1">{projectCount("Installation")} instalasi</p>
        </div>
      </div>

      {/* Pipeline breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lead pipeline */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Pipeline Lead</h3>
            <Link href="/leads" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <div className="space-y-2">
            {["New Lead", "Contacted", "Survey", "Deal", "Lost"].map((s) => {
              const count = leadCount(s);
              const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-28 text-center ${leadStatusColors[s] || "bg-gray-100 text-gray-700"}`}>{s}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-gray-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Status Project</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <div className="space-y-2">
            {["Design", "Production", "Installation", "Done"].map((s) => {
              const count = projectCount(s);
              const pct = projects.length ? Math.round((count / projects.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-28 text-center ${projectStatusColors[s] || "bg-gray-100 text-gray-700"}`}>{s}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-gray-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-5 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent clients */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Client Terbaru</h3>
            <Link href="/clients" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentClients.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 text-xs">{c.name}</p>
                    <p className="text-gray-400 text-xs">{c.source || "-"}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.lead_status ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.lead_status}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {recentClients.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-xs">Belum ada client</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent projects */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Project Terbaru</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {recentProjects.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 text-xs">{p.name}</p>
                      <p className="text-gray-400 text-xs">{formatCurrency(p.budget)}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${projectStatusColors[p.status] || "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                    </td>
                  </tr>
                );
              })}
              {recentProjects.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-gray-400 text-xs">Belum ada project</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
