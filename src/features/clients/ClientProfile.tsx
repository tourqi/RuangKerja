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
import { StatusDot, LEAD_STATUS_TONE } from "@/components/ui/StatusDot";
import { WhatsAppLink } from "@/components/WhatsAppLink";

const TAB_KEYS = ["ringkasan", "lead", "proyek", "invoice"] as const;
import { formatIDR, formatDate } from "@/utils/format";

const formatCurrency = (v?: number) =>
  v == null
    ? "—"
    : formatIDR(v);


const leadStatusColors: Record<string, string> = {
  "New Lead": "tone-active",
  Contacted: "tone-warning",
  "Meeting Scheduled": "tone-warning",
  "Proposal Sent": "tone-active",
  Negotiation: "tone-active",
  "Deal Won": "tone-success",
  "Deal Lost": "tone-danger",
  Survey: "tone-active",
  Deal: "tone-success",
  Lost: "tone-danger",
};
const priorityColors: Record<string, string> = {
  Low: "tone-neutral",
  Medium: "tone-active",
  High: "tone-warning",
  Urgent: "tone-danger",
  low: "tone-neutral",
  medium: "tone-active",
  high: "tone-warning",
  urgent: "tone-danger",
};
const projectStatusColors: Record<string, string> = {
  Planning: "tone-neutral",
  Design: "tone-active",
  Production: "tone-warning",
  Installation: "tone-active",
  Done: "tone-success",
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
      <p className="text-xs font-medium text-faint mb-0.5">{label}</p>
      <p className="text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

const invoiceStatusColors: Record<string, string> = {
  draft: "tone-neutral",
  sent: "tone-active",
  partial: "tone-warning",
  paid: "tone-success",
  overdue: "tone-danger",
};

export default function ClientProfile({ clientId }: { clientId: string }) {
  const { clients, loading: lc, error: clientsError, refetch: refetchClients } = useClients();
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
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-line border-t-ink" />
      </div>
    );
  }

  const client = clients.find((c) => c.id === clientId);

  if (!client) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition mb-6">
          <span>←</span> Kembali
        </button>
        <div className="bg-white rounded-md border border-line p-12 text-center">
          <p className="text-faint text-sm">{clientsError ? 'Data gagal dimuat. Tekan "Coba lagi" di atas.' : "Client tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  const clientLeads = leads.filter((l) => l.client_id === clientId);
  const clientProjects = projects.filter((p) => p.client_id === clientId);
  const clientInvoices = invoices.filter((inv) => inv.client_id === clientId);
  const totalProjectValue = clientProjects.reduce((s, p) => s + getProjectValue(p), 0);
  const activeProjects = clientProjects.filter((p) => p.status !== "Done").length;
  const outstanding = clientInvoices.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink truncate">{client.name}</h1>
            <p className="text-[13px] text-muted mt-0.5">Bergabung {formatDate(client.created_at)}</p>
          </div>
          <div className="self-start flex gap-2 shrink-0">
            <WhatsAppLink phone={client.phone} variant="button" />
            <button
              onClick={() => setEditOpen(true)}
              className="px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors shrink-0"
            >
              Edit
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-muted">
          {client.lead_status && <StatusDot tone={LEAD_STATUS_TONE[client.lead_status] ?? "neutral"}>{client.lead_status}</StatusDot>}
          {client.priority && <span>Prioritas <span className="text-ink font-medium capitalize">{client.priority}</span></span>}
          {client.phone && <span>No. HP <span className="text-ink font-medium">{client.phone}</span></span>}
          {client.property_type && <span>Properti <span className="text-ink font-medium">{client.property_type}</span></span>}
          {client.budget_range && <span>Budget <span className="text-ink font-medium">{client.budget_range}</span></span>}
        </div>
      </div>

      {/* Angka utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-line -mx-4 sm:-mx-6 lg:-mx-8 [&>div]:px-4 sm:[&>div]:px-6 lg:[&>div]:px-8">
        <div className="py-3 border-r border-line">
          <p className="text-xs text-muted">Lead</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{clientLeads.length}</p>
        </div>
        <div className="py-3 lg:border-r border-line">
          <p className="text-xs text-muted">Proyek</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{clientProjects.length}</p>
          <p className="text-[11.5px] text-faint mt-0.5">{activeProjects} sedang berjalan</p>
        </div>
        <div className="py-3 border-r border-t lg:border-t-0 border-line">
          <p className="text-xs text-muted">Total nilai proyek</p>
          <p className="font-mono text-base font-medium text-ink mt-0.5">{totalProjectValue > 0 ? formatCurrency(totalProjectValue) : "—"}</p>
        </div>
        <div className="py-3 border-t lg:border-t-0 border-line">
          <p className="text-xs text-muted">Belum dibayar</p>
          <p className={`font-mono text-base font-medium mt-0.5 ${outstanding > 0 ? "text-danger" : "text-ink"}`}>{formatCurrency(outstanding)}</p>
          <p className="text-[11.5px] text-faint mt-0.5">dari {clientInvoices.length} invoice</p>
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
      <div className="bg-white rounded-md border border-line p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">Informasi Client</h2>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent bg-accent-soft rounded-md hover:bg-accent-soft transition"
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
          <InfoRow label="Nama Proyek" value={client.project_name} />
          <InfoRow label="Alamat" value={client.address} />
          <InfoRow label="Tipe Properti" value={client.property_type} />
          <InfoRow label="Budget" value={client.budget_range} />
        </div>
        {client.notes && (
          <div className="mt-5 pt-5 border-t border-line">
            <p className="text-xs font-medium text-faint mb-1">Catatan</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Journey timeline */}
      {(clientLeads.length > 0 || clientProjects.length > 0) && (
        <div className="bg-white rounded-md border border-line p-6">
          <h2 className="text-sm font-semibold text-ink mb-4">Kronologi</h2>
          <div className="space-y-0">
            {[
              ...clientLeads.map((l) => ({
                date: l.created_at,
                label: `Lead dibuat`,
                sub: `Status: ${l.status}${l.assigned_to ? ` · Oleh: ${l.assigned_to}` : ""}`,
                color: "bg-accent",
              })),
              ...clientLeads
                .filter((l) => l.closed_at)
                .map((l) => ({
                  date: l.closed_at,
                  label: `Lead ditutup`,
                  sub: `Status akhir: ${l.status}`,
                  color: l.status === "Deal Won" ? "bg-success" : "bg-danger",
                })),
              ...clientProjects.map((p) => ({
                date: p.created_at,
                label: `Proyek dibuat: ${p.name}`,
                sub: `${projectStatusLabel[p.status] ?? p.status}${getProjectValue(p) ? ` · ${formatCurrency(getProjectValue(p))}` : ""}`,
                color: "bg-accent",
              })),
            ]
              .filter((e) => e.date)
              .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
              .map((event, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${event.color}`} />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-hover mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-xs font-medium text-ink">{event.label}</p>
                    <p className="text-xs text-faint">{event.sub}</p>
                    <p className="text-xs text-faint mt-0.5">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      </>)}

      {/* Leads */}
      {activeTab === "lead" && (
      <div className="bg-white rounded-md border border-line overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">
            Lead Terkait
            <span className="ml-2 px-2 py-0.5 rounded-full bg-hover text-muted text-xs font-medium">{clientLeads.length}</span>
          </h2>
          <Link href="/leads" className="text-xs text-accent hover:underline">Kelola lead →</Link>
        </div>
        {clientLeads.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-faint">Belum ada lead terkait client ini.</p>
            <Link href="/leads" className="mt-2 inline-block text-xs text-accent hover:underline">Tambah lead →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-surface border-b border-line">
                <tr>
                  {["Status", "Prioritas", "Sumber", "Follow-up", "Last Contact", "Catatan", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clientLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusColors[lead.status] || "tone-neutral"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {lead.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${priorityColors[lead.priority] || "tone-neutral"}`}>
                          {lead.priority}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{lead.source || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(lead.follow_up_date)}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(lead.last_contacted_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted max-w-[200px] truncate">{lead.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="text-xs text-accent hover:underline whitespace-nowrap">Lihat →</Link>
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
      <div className="bg-white rounded-md border border-line overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">
            Proyek Terkait
            <span className="ml-2 px-2 py-0.5 rounded-full bg-hover text-muted text-xs font-medium">{clientProjects.length}</span>
          </h2>
          <div className="flex items-center gap-3">
            {activeProjects > 0 && (
              <span className="text-xs text-warning font-medium">{activeProjects} aktif</span>
            )}
            <Link href="/projects" className="text-xs text-accent hover:underline">Kelola proyek →</Link>
          </div>
        </div>
        {clientProjects.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-faint">Belum ada proyek terkait client ini.</p>
            <Link href="/projects" className="mt-2 inline-block text-xs text-accent hover:underline">Tambah proyek →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-surface border-b border-line">
                <tr>
                  {["Nama Proyek", "Status", "Nilai", "Progress", "Start", "Deadline", "PIC", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clientProjects.map((project) => {
                  const progress = project.progress ?? 0;
                  const isOverdue =
                    project.deadline &&
                    project.status !== "Done" &&
                    new Date(project.deadline) < new Date();
                  return (
                    <tr key={project.id} className="hover:bg-hover transition-colors">
                      <td className="px-4 py-3 font-medium text-ink text-xs whitespace-nowrap">{project.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${projectStatusColors[project.status] || "tone-neutral"}`}>
                          {projectStatusLabel[project.status] ?? project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink whitespace-nowrap">{formatCurrency(getProjectValue(project))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-hover rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${progress >= 100 ? "bg-success" : "bg-accent"}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted w-7">{progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(project.start_date)}</td>
                      <td className={`px-4 py-3 text-xs whitespace-nowrap font-medium ${isOverdue ? "text-danger" : "text-muted"}`}>
                        {formatDate(project.deadline)}
                        {isOverdue && <span className="ml-1 text-danger">(overdue)</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{project.assigned_to || "—"}</td>
                      <td className="px-4 py-3">
                        <Link href={`/projects/${project.id}`} className="text-xs text-accent hover:underline whitespace-nowrap">Lihat →</Link>
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
      <div className="bg-white rounded-md border border-line overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">
            Invoice Terkait
            <span className="ml-2 px-2 py-0.5 rounded-full bg-hover text-muted text-xs font-medium">{clientInvoices.length}</span>
          </h2>
          <Link href="/invoices" className="text-xs text-accent hover:underline">Kelola invoice →</Link>
        </div>
        {clientInvoices.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-faint">Belum ada invoice terkait client ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-surface border-b border-line">
                <tr>
                  {["No. Invoice", "Tanggal", "Jatuh Tempo", "Total", "Terbayar", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clientInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-hover transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-ink whitespace-nowrap">{inv.invoice_number || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-xs text-ink whitespace-nowrap">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-xs text-ink whitespace-nowrap">{formatCurrency(inv.paid_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${invoiceStatusColors[inv.status] || "tone-neutral"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-xs text-accent hover:underline whitespace-nowrap">Lihat →</Link>
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
