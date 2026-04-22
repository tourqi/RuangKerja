"use client";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import Link from "next/link";
import { useRouter } from "next/navigation";

const formatCurrency = (v?: number) =>
  v == null
    ? "-"
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

const leadStatusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  "Meeting Scheduled": "bg-orange-100 text-orange-700",
  "Proposal Sent": "bg-indigo-100 text-indigo-700",
  Negotiation: "bg-purple-100 text-purple-700",
  "Deal Won": "bg-green-100 text-green-700",
  "Deal Lost": "bg-red-100 text-red-700",
  Survey: "bg-purple-100 text-purple-700",
  Deal: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};
const priorityColors: Record<string, string> = {
  Low: "bg-gray-100 text-gray-600",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};
const projectStatusColors: Record<string, string> = {
  Planning: "bg-gray-100 text-gray-600",
  Design: "bg-blue-100 text-blue-700",
  Production: "bg-yellow-100 text-yellow-700",
  Installation: "bg-purple-100 text-purple-700",
  Done: "bg-green-100 text-green-700",
};
const projectStatusLabel: Record<string, string> = {
  Planning: "Planning",
  Design: "Design",
  Production: "Produksi",
  Installation: "Instalasi",
  Done: "Selesai",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || "-"}</p>
    </div>
  );
}

export default function ClientProfile({ clientId }: { clientId: string }) {
  const { clients, loading: lc } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const router = useRouter();

  const loading = lc || ll || lp;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition mb-6">
          <span>←</span> Kembali
        </button>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Client tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const clientLeads = leads.filter((l) => l.client_id === clientId);
  const clientProjects = projects.filter((p) => p.client_id === clientId);
  const totalProjectValue = clientProjects.reduce((s, p) => s + (p.value ?? 0), 0);
  const activeProjects = clientProjects.filter((p) => p.status !== "Done").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
        <span>←</span> Kembali ke Clients
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Bergabung {formatDate(client.created_at)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {client.lead_status && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${leadStatusColors[client.lead_status] || "bg-gray-100 text-gray-700"}`}>
                  {client.lead_status}
                </span>
              )}
              {client.priority && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priorityColors[client.priority] || "bg-gray-100 text-gray-700"}`}>
                  Prioritas: {client.priority}
                </span>
              )}
              {client.property_type && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {client.property_type}
                </span>
              )}
              {client.budget_range && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                  {client.budget_range}
                </span>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 sm:gap-6 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{clientLeads.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Lead</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{clientProjects.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Proyek</p>
            </div>
            {totalProjectValue > 0 && (
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">
                  {new Intl.NumberFormat("id-ID", { notation: "compact", currency: "IDR", style: "currency", minimumFractionDigits: 0 }).format(totalProjectValue)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Total Nilai</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Informasi Client</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          <InfoRow label="No. HP" value={client.phone} />
          <InfoRow label="Sumber" value={client.source} />
          <InfoRow label="Nama Project" value={client.project_name} />
          <InfoRow label="Alamat" value={client.address} />
          <InfoRow label="Tipe Properti" value={client.property_type} />
          <InfoRow label="Budget" value={client.budget_range} />
        </div>
        {client.notes && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Catatan</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Leads */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Lead Terkait
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{clientLeads.length}</span>
          </h2>
          <Link href="/leads" className="text-xs text-blue-600 hover:underline">Kelola lead →</Link>
        </div>
        {clientLeads.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">Belum ada lead terkait client ini.</p>
            <Link href="/leads" className="mt-2 inline-block text-xs text-blue-600 hover:underline">Tambah lead →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Status", "Prioritas", "Sumber", "Follow-up", "Last Contact", "Catatan"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusColors[lead.status] || "bg-gray-100 text-gray-600"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[lead.priority] || "bg-gray-100 text-gray-600"}`}>
                          {lead.priority}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{lead.source || "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(lead.follow_up_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(lead.last_contacted_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{lead.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Proyek Terkait
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{clientProjects.length}</span>
          </h2>
          <div className="flex items-center gap-3">
            {activeProjects > 0 && (
              <span className="text-xs text-orange-600 font-medium">{activeProjects} aktif</span>
            )}
            <Link href="/projects" className="text-xs text-blue-600 hover:underline">Kelola proyek →</Link>
          </div>
        </div>
        {clientProjects.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">Belum ada proyek terkait client ini.</p>
            <Link href="/projects" className="mt-2 inline-block text-xs text-blue-600 hover:underline">Tambah proyek →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Nama Proyek", "Status", "Nilai", "Progress", "Start", "Deadline", "PIC"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientProjects.map((project) => {
                  const progress = project.progress ?? 0;
                  const isOverdue =
                    project.deadline &&
                    project.status !== "Done" &&
                    new Date(project.deadline) < new Date();
                  return (
                    <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 text-xs whitespace-nowrap">{project.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${projectStatusColors[project.status] || "bg-gray-100 text-gray-600"}`}>
                          {projectStatusLabel[project.status] ?? project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(project.value)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${progress >= 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-7">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(project.start_date)}</td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap font-medium ${isOverdue ? "text-red-600" : "text-gray-500"}`}>
                        {formatDate(project.deadline)}
                        {isOverdue && <span className="ml-1 text-red-400">(overdue)</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{project.assigned_to || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Journey timeline */}
      {(clientLeads.length > 0 || clientProjects.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Kronologi</h2>
          <div className="space-y-0">
            {[
              ...clientLeads.map((l) => ({
                date: l.created_at,
                label: `Lead dibuat`,
                sub: `Status: ${l.status}${l.assigned_to ? ` · Oleh: ${l.assigned_to}` : ""}`,
                color: "bg-blue-500",
              })),
              ...clientLeads
                .filter((l) => l.closed_at)
                .map((l) => ({
                  date: l.closed_at,
                  label: `Lead ditutup`,
                  sub: `Status akhir: ${l.status}`,
                  color: l.status === "Deal" ? "bg-green-500" : "bg-red-400",
                })),
              ...clientProjects.map((p) => ({
                date: p.created_at,
                label: `Proyek dibuat: ${p.name}`,
                sub: `${projectStatusLabel[p.status] ?? p.status}${p.value ? ` · ${formatCurrency(p.value)}` : ""}`,
                color: "bg-purple-500",
              })),
            ]
              .filter((e) => e.date)
              .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
              .map((event, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${event.color}`} />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-medium text-gray-800">{event.label}</p>
                    <p className="text-xs text-gray-400">{event.sub}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
