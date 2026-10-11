"use client";
import { Client } from "@/types/db";
import { CLIENT_LEAD_STATUS_COLORS, PRIORITY_COLORS } from "@/constants/options";

type Props = {
  client: Client;
  onClose: () => void;
  onEdit: (client: Client) => void;
};

export function ClientViewModal({ client, onClose, onEdit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Detail Client</h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition"
            onClick={onClose}
          >✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Nama", value: client.name },
              { label: "No. HP", value: client.phone },
              { label: "Alamat", value: client.address },
              { label: "Nama Project", value: client.project_name },
              { label: "Tipe Properti", value: client.property_type },
              { label: "Budget", value: client.budget_range },
              { label: "Sumber", value: client.source },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs font-medium text-faint mb-0.5">{label}</p>
                <p className="text-sm text-ink">{value || "-"}</p>
              </div>
            ))}
            <div>
              <p className="text-xs font-medium text-faint mb-0.5">Prioritas</p>
              {client.priority ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[client.priority] || "tone-neutral"}`}>
                  {client.priority}
                </span>
              ) : <p className="text-sm text-ink">-</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-faint mb-0.5">Status Lead</p>
              {client.lead_status ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_LEAD_STATUS_COLORS[client.lead_status] || "tone-neutral"}`}>
                  {client.lead_status}
                </span>
              ) : <p className="text-sm text-ink">-</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-faint mb-0.5">Catatan</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{client.notes || "-"}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button
              className="px-4 py-2 text-sm font-medium bg-accent-soft text-accent rounded-md hover:bg-accent-soft transition"
              onClick={() => { onClose(); onEdit(client); }}
            >Edit</button>
            <button
              className="px-4 py-2 text-sm font-medium bg-hover text-ink rounded-md hover:bg-hover transition"
              onClick={onClose}
            >Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
