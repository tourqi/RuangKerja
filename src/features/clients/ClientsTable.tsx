"use client";
import React, { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { addClient, updateClient, deleteClient } from "@/services/clients";
import { Client } from "@/types/db";

const leadStatusColors: Record<string, string> = {
  "New Lead": "bg-blue-100 text-blue-800",
  "Contacted": "bg-yellow-100 text-yellow-800",
  "Meeting Scheduled": "bg-orange-100 text-orange-800",
  "Proposal Sent": "bg-indigo-100 text-indigo-800",
  "Negotiation": "bg-purple-100 text-purple-800",
  "Deal Won": "bg-green-100 text-green-800",
  "Deal Lost": "bg-red-100 text-red-800",
};

const priorityColors: Record<string, string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Urgent: "bg-red-100 text-red-700",
};

export default function ClientsTable() {
  const { clients, loading, error, refetch } = useClients();
  const [form, setForm] = useState<Partial<Client>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  const [filter, setFilter] = useState({
    name: "",
    project_name: "",
    property_type: "",
    budget_range: "",
    lead_status: "",
    source: "",
    priority: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      setForm({ ...form, [name]: value.replace(/\D/g, "").slice(0, 13) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAdd = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addClient({ ...form, name: form.name || "" });
      setForm({});
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert("Gagal menambah client: " + msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm(client);
    setShowModal(true);
  };

  const handleUpdate = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateClient(editingId, form);
      setEditingId(null);
      setForm({});
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert("Gagal update client: " + msg);
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
      await deleteClient(deletingId);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert("Gagal hapus client: " + msg);
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  const filteredClients = clients.filter((c) =>
    (!filter.name || c.name?.toLowerCase().includes(filter.name.toLowerCase())) &&
    (!filter.project_name || c.project_name?.toLowerCase().includes(filter.project_name.toLowerCase())) &&
    (!filter.property_type || c.property_type === filter.property_type) &&
    (!filter.budget_range || c.budget_range === filter.budget_range) &&
    (!filter.lead_status || c.lead_status === filter.lead_status) &&
    (!filter.source || c.source === filter.source) &&
    (!filter.priority || c.priority === filter.priority)
  );

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{filteredClients.length} client ditemukan</p>
          <button
            className="px-5 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition font-medium"
            onClick={() => { setEditingId(null); setForm({}); setShowModal(true); }}
          >
            + Tambah Client
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <input
            name="name"
            value={filter.name}
            onChange={handleFilterChange}
            placeholder="Cari Nama..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none"
          />
          <input
            name="project_name"
            value={filter.project_name}
            onChange={handleFilterChange}
            placeholder="Cari Project..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 focus:ring-2 focus:ring-black focus:border-black outline-none"
          />
          <select name="property_type" value={filter.property_type} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-lg text-sm  text-gray-500 outline-none">
            <option value="">Semua Tipe</option>
            <option value="Rumah">Rumah</option>
            <option value="Ruko">Ruko</option>
            <option value="Apartemen">Apartemen</option>
            <option value="Tanah">Tanah</option>
          </select>
          <select name="budget_range" value={filter.budget_range} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 outline-none">
            <option value="">Semua Budget</option>
            <option value="< 500jt">{"< 500jt"}</option>
            <option value="500jt - 1M">500jt - 1M</option>
            <option value="> 1M">{"> 1M"}</option>
          </select>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select name="lead_status" value={filter.lead_status} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 outline-none">
            <option value="">Semua Status</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Meeting Scheduled">Meeting Scheduled</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Deal Won">Deal Won</option>
            <option value="Deal Lost">Deal Lost</option>
          </select>
          <select name="source" value={filter.source} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 outline-none">
            <option value="">Semua Sumber</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Marketplace">Marketplace</option>
            <option value="Ads (Google/Facebook)">Ads (Google/Facebook)</option>
          </select>
          <select name="priority" value={filter.priority} onChange={handleFilterChange} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 outline-none">
            <option value="">Semua Prioritas</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <button
            onClick={() => setFilter({ name: "", project_name: "", property_type: "", budget_range: "", lead_status: "", source: "", priority: "" })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition outline-none"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800">Daftar Client</h3>
        </div>
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Nama", "No. HP", "Alamat", "Nama Project", "Tipe", "Budget", "Status", "Sumber", "Prioritas", "Catatan", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap max-w-[150px] truncate">{client.name}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.phone || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{client.address || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate">{client.project_name || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.property_type || "-"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.budget_range || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.lead_status ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusColors[client.lead_status] || "bg-gray-100 text-gray-700"}`}>
                          {client.lead_status}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{client.source || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {client.priority ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[client.priority] || "bg-gray-100 text-gray-700"}`}>
                          {client.priority}
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{client.notes || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition"
                          onClick={() => setViewingClient(client)}
                        >
                          Lihat
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                          onClick={() => handleEdit(client)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                          onClick={() => confirmDelete(client.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-gray-400 text-sm">
                      Tidak ada client yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Client" : "Tambah Client Baru"}
              </h2>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                onClick={() => { setShowModal(false); setEditingId(null); setForm({}); }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
                  <input name="name" value={form.name || ""} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. HP <span className="text-red-500">*</span></label>
                  <input name="phone" value={form.phone || ""} onChange={handleChange} required maxLength={13} pattern="[0-9]*" placeholder="08xxxxxxxxxx" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                  <input name="address" value={form.address || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project</label>
                  <input name="project_name" value={form.project_name || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Properti</label>
                  <select name="property_type" value={form.property_type || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                    <option value="">Pilih tipe</option>
                    <option value="Rumah">Rumah</option>
                    <option value="Ruko">Ruko</option>
                    <option value="Apartemen">Apartemen</option>
                    <option value="Tanah">Tanah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <select name="budget_range" value={form.budget_range || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                    <option value="">Pilih budget</option>
                    <option value="< 500jt">{"< 500jt"}</option>
                    <option value="500jt - 1M">500jt - 1M</option>
                    <option value="> 1M">{"> 1M"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Lead</label>
                  <select name="lead_status" value={form.lead_status || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                    <option value="">Pilih status</option>
                    <option value="New Lead">New Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Meeting Scheduled">Meeting Scheduled</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Deal Won">Deal Won</option>
                    <option value="Deal Lost">Deal Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sumber</label>
                  <select name="source" value={form.source || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                    <option value="">Pilih sumber</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="Marketplace">Marketplace</option>
                    <option value="Ads (Google/Facebook)">Ads (Google/Facebook)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                  <select name="priority" value={form.priority || ""} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
                    <option value="">Pilih prioritas</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <textarea name="notes" value={form.notes || ""} onChange={handleChange} rows={3} placeholder="Catatan tambahan..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black outline-none resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Client"}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                  onClick={() => { setShowModal(false); setEditingId(null); setForm({}); }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Detail Client</h2>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                onClick={() => setViewingClient(null)}
              >✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nama", value: viewingClient.name },
                  { label: "No. HP", value: viewingClient.phone },
                  { label: "Alamat", value: viewingClient.address },
                  { label: "Nama Project", value: viewingClient.project_name },
                  { label: "Tipe Properti", value: viewingClient.property_type },
                  { label: "Budget", value: viewingClient.budget_range },
                  { label: "Sumber", value: viewingClient.source },
                  { label: "Prioritas", value: viewingClient.priority },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm text-gray-800">{value || "-"}</p>
                  </div>
                ))}
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Status Lead</p>
                  {viewingClient.lead_status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${leadStatusColors[viewingClient.lead_status] || "bg-gray-100 text-gray-700"}`}>
                      {viewingClient.lead_status}
                    </span>
                  ) : <p className="text-sm text-gray-800">-</p>}
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Catatan</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewingClient.notes || "-"}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  className="px-4 py-2 text-sm font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  onClick={() => { setViewingClient(null); handleEdit(viewingClient); }}
                >Edit</button>
                <button
                  className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  onClick={() => setViewingClient(null)}
                >Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus Client?</h3>
            <p className="text-sm text-gray-500 mb-5">Data client akan dihapus permanen dan tidak dapat dikembalikan.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {saving ? "Menghapus..." : "Ya, Hapus"}
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingId(null); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
