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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Detail Client</h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
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
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm text-gray-800">{value || "-"}</p>
              </div>
            ))}
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Prioritas</p>
              {client.priority ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_COLORS[client.priority] || "bg-gray-100 text-gray-700"}`}>
                  {client.priority}
                </span>
              ) : <p className="text-sm text-gray-800">-</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Status Lead</p>
              {client.lead_status ? (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLIENT_LEAD_STATUS_COLORS[client.lead_status] || "bg-gray-100 text-gray-700"}`}>
                  {client.lead_status}
                </span>
              ) : <p className="text-sm text-gray-800">-</p>}
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Catatan</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{client.notes || "-"}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              onClick={() => { onClose(); onEdit(client); }}
            >Edit</button>
            <button
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              onClick={onClose}
            >Tutup</button>
          </div>
        </div>
      </div>
    </div>
  );
}
