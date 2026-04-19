"use client";
import React, { useState } from "react";
import { useLeads } from "@/hooks/useLeads";
import { useClients } from "@/hooks/useClients";
import { addLead, updateLead, deleteLead } from "@/services/leads";
import { Lead, LeadStatus } from "@/types/db";

const statusOptions: LeadStatus[] = ["New Lead", "Contacted", "Survey", "Deal", "Lost"];

const statusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Survey: "bg-purple-100 text-purple-800",
  Deal: "bg-green-100 text-green-800",
  Lost: "bg-red-100 text-red-800",
};

export default function LeadsTable() {
  const { leads, loading, error, refetch } = useLeads();
  const { clients } = useClients();
  const [form, setForm] = useState<Partial<Lead>>({ status: "New Lead" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addLead({ client_id: form.client_id!, status: form.status as LeadStatus, notes: form.notes });
      setForm({ status: "New Lead" });
      setShowModal(false);
      refetch();
    } catch {
      alert("Gagal menambah lead");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm(lead);
    setShowModal(true);
  };

  const handleUpdate = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateLead(editingId, form);
      setEditingId(null);
      setForm({ status: "New Lead" });
      setShowModal(false);
      refetch();
    } catch {
      alert("Gagal update lead");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      await deleteLead(deletingId);
      refetch();
    } catch {
      alert("Gagal hapus lead");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );

  if (error)
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">Error: {error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{leads.length} lead</p>
        <button
          className="px-5 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition font-medium"
          onClick={() => { setEditingId(null); setForm({ status: "New Lead" }); setShowModal(true); }}
        >
          + Tambah Lead
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800">Pipeline Lead</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Client", "Status", "Catatan", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => {
                const client = clients.find((c) => c.id === lead.client_id);
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{client?.name || "-"}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{lead.notes || "-"}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs font-medium bg-purple-50 text-purple-600 rounded-md hover:bg-purple-100 transition"
                          onClick={() => handleEdit(lead)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                          onClick={() => confirmDelete(lead.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Belum ada lead. Klik "Tambah Lead" untuk memulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Lead" : "Tambah Lead Baru"}
              </h2>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                onClick={() => { setShowModal(false); setEditingId(null); setForm({ status: "New Lead" }); }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client <span className="text-red-500">*</span></label>
                <select
                  name="client_id"
                  value={form.client_id || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Pilih Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                <select
                  name="status"
                  value={form.status || "New Lead"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea
                  name="notes"
                  value={form.notes || ""}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Catatan tentang lead ini..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Lead"}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                  onClick={() => { setShowModal(false); setEditingId(null); setForm({ status: "New Lead" }); }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus Lead?</h3>
            <p className="text-sm text-gray-500 mb-5">Data lead ini akan dihapus permanen.</p>
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={saving} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50">
                {saving ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button onClick={() => { setShowDeleteModal(false); setDeletingId(null); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition">
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
