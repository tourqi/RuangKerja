"use client";
import { Lead, Client } from "@/types/db";
import { LEAD_STATUS_COLORS, PRIORITY_COLORS } from "@/constants/options";
import { formatDate } from "@/utils/format";
import { DialogA11y } from "@/components/DialogA11y";

type Props = {
  lead: Lead;
  client?: Client;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
};

export function LeadViewModal({ lead, client, onClose, onEdit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogA11y onClose={onClose} />
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Detail Lead</h2>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition" onClick={onClose}>✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <p className="text-xs font-medium text-faint mb-0.5">Klien</p>
              <p className="text-sm font-semibold text-ink">{client?.name || "—"}</p>
              {client?.phone && <p className="text-xs text-faint">{client.phone}</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-faint mb-1">Status</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.status] || "tone-neutral"}`}>{lead.status}</span>
            </div>
            <div>
              <p className="text-xs font-medium text-faint mb-1">Prioritas</p>
              {lead.priority
                ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[lead.priority] || "tone-neutral"}`}>{lead.priority}</span>
                : <p className="text-sm text-ink">—</p>}
            </div>
            {[
              { label: "Source", value: lead.source || client?.source },
              { label: "Follow Up Date", value: formatDate(lead.follow_up_date) },
              { label: "Last Contacted At", value: formatDate(lead.last_contacted_at) },
              { label: "Closed At", value: formatDate(lead.closed_at) },
              { label: "Updated At", value: formatDate(lead.updated_at) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-faint mb-0.5">{label}</p>
                <p className="text-sm text-ink">{value || "—"}</p>
              </div>
            ))}
            <div className="col-span-2">
              <p className="text-xs font-medium text-faint mb-0.5">Catatan</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{lead.notes || "—"}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button className="px-4 py-2 text-sm font-medium bg-accent-soft text-accent rounded-md hover:bg-accent-soft transition" onClick={() => { onClose(); onEdit(lead); }}>Edit</button>
            <button className="px-4 py-2 text-sm font-medium bg-hover text-ink rounded-md hover:bg-hover transition" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
