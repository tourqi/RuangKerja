"use client";
import { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useInvoices";
import { useApprovedRabTotals } from "@/hooks/useRab";
import { getProjectValue as computeProjectValue } from "@/utils/projectValue";
import { ClientFormModal } from "./ClientFormModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DetailTabs, useTabParam } from "@/components/DetailTabs";

const TAB_KEYS = ["ringkasan", "lead", "proyek", "invoice"] as const;
import { formatIDR } from "@/utils/format";

const formatCurrency = (v?: number) =>
  v == null
    ? "-"
    : formatIDR(v);

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

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

export default function ClientProfile({ clientId }: { clientId: string }) {
  const { clients, loading: lc, refetch: refetchClients } = useClients();
  const { leads, loading: ll } = useLeads();
  const { projects, loading: lp } = useProjects();
  const { invoices, loading: li } = useInvoices();
  const { totals: rabTotals } = useApprovedRabTotals();
  const router = useRouter();

  const getProjectValue = (p: { lead_id?: string; value?: number }) => computeProjectValue(p, rabTotals);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useTabParam(TAB_KEYS, "ringkasan");

  const loading = lc || ll || lp || li;

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
      <div className="p-6">
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
  const clientInvoices = invoices.filter((inv) => inv.client_id === clientId);
  const totalProjectValue = clientProjects.reduce((s, p) => s + getProjectValue(p), 0);
  const activeProjects = clientProjects.filter((p) => p.status !== "Done").length;

  return (
    <div className="p-6 space-y-6">
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${priorityColors[client.priority] || "bg-gray-100 text-gray-700"}`}>
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

      {editOpen && (
        <ClientFormModal
          client={client}
          onSaved={() => { setEditOpen(false); refetchClients(); }}
          onClose={() => setEditOpen(false)}
        />
      )}

      <DetailTabs
        tabs={[
          { key: "ringkasan", label: "Ringkasan" },
          { key: "lead", label: "Lead", count: clientLeads.length },
          { key: "proyek", label: "Proyek", count: clientProjects.length },
          { key: "invoice", label: "Invoice", count: clientInvoices.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "ringkasan" && (<>
      {/* Info grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Informasi Client</h2>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        </div>
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
                  color: l.status === "Deal Won" ? "bg-green-500" : "bg-red-400",
                })),
              ...clientProjects.map((p) => ({
                date: p.created_at,
                label: `Proyek dibuat: ${p.name}`,
                sub: `${projectStatusLabel[p.status] ?? p.status}${getProjectValue(p) ? ` · ${formatCurrency(getProjectValue(p))}` : ""}`,
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
      </>)}

      {/* Leads */}
      {activeTab === "lead" && (
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
                  {["Status", "Prioritas", "Sumber", "Follow-up", "Last Contact", "Catatan", ""].map((h) => (
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[lead.priority] || "bg-gray-100 text-gray-600"}`}>
                          {lead.priority}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{lead.source || "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(lead.follow_up_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(lead.last_contacted_at)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{lead.notes || "-"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Lihat →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Projects */}
      {activeTab === "proyek" && (
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
                  {["Nama Proyek", "Status", "Nilai", "Progress", "Start", "Deadline", "PIC", ""].map((h) => (
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
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(getProjectValue(project))}</td>
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
                      <td className="px-4 py-3">
                        <Link href={`/projects/${project.id}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Lihat →</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Invoices */}
      {activeTab === "invoice" && (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Invoice Terkait
            <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{clientInvoices.length}</span>
          </h2>
          <Link href="/invoices" className="text-xs text-blue-600 hover:underline">Kelola invoice →</Link>
        </div>
        {clientInvoices.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-400">Belum ada invoice terkait client ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["No. Invoice", "Tanggal", "Jatuh Tempo", "Total", "Terbayar", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{inv.invoice_number || "-"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(inv.paid_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${invoiceStatusColors[inv.status] || "bg-gray-100 text-gray-600"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">Lihat →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      )}
    </div>
  );
}
