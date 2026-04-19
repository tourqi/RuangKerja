
"use client";
import React, { useState } from "react";
import { useClients } from "@/hooks/useClients";
import { addClient, updateClient, deleteClient } from "@/services/clients";
import { Client } from "@/types/db";

export default function ClientsTable() {
  const { clients, loading, error } = useClients();
  const [form, setForm] = useState<Partial<Client>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  React.useEffect(() => {
    // Optionally trigger data refresh if your hook supports it
  }, [refresh]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numeric = value.replace(/\D/g, "").slice(0, 13);
      setForm({ ...form, [name]: numeric });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addClient({
        ...form,
        name: form.name || "",
      });
      setForm({});
      setShowModal(false);
      setRefresh((r) => r + 1);
    } catch (err: any) {
      alert("Failed to add client: " + (err?.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm(client);
    setShowModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateClient(editingId, form);
      setEditingId(null);
      setForm({});
      setShowModal(false);
      setRefresh((r) => r + 1);
    } catch (err: any) {
      alert("Failed to update client: " + (err?.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    setSaving(true);
    try {
      await deleteClient(id);
      setRefresh((r) => r + 1);
    } catch (err: any) {
      alert("Failed to delete client: " + (err?.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  };

  // Filter state
  const [filter, setFilter] = useState({
    name: "",
    project_name: "",
    property_type: "",
    budget_range: "",
    lead_status: "",
    source: "",
    priority: "",
  });

  // Filtered clients
  const filteredClients = clients.filter((client) => {
    return (
      (!filter.name || client.name?.toLowerCase().includes(filter.name.toLowerCase())) &&
      (!filter.project_name || client.project_name?.toLowerCase().includes(filter.project_name.toLowerCase())) &&
      (!filter.property_type || client.property_type === filter.property_type) &&
      (!filter.budget_range || client.budget_range === filter.budget_range) &&
      (!filter.lead_status || client.lead_status === filter.lead_status) &&
      (!filter.source || client.source === filter.source) &&
      (!filter.priority || client.priority === filter.priority)
    );
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      {/* Filter & Add Button Row */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex justify-end">
          <button
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 transition w-full md:w-auto"
            onClick={() => {
              setEditingId(null);
              setForm({});
              setShowModal(true);
            }}
          >
            ➕ Tambah Data
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 w-full">
          <input
            name="name"
            value={filter.name}
            onChange={handleFilterChange}
            placeholder="Cari Nama"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-black focus:ring-2 focus:ring-black focus:border-black"
          />
          <input
            name="project_name"
            value={filter.project_name}
            onChange={handleFilterChange}
            placeholder="Cari Project"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder:text-black focus:ring-2 focus:ring-black focus:border-black"
          />
          <select
            name="property_type"
            value={filter.property_type}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:text-black"
          >
            <option value="">Tipe Properti</option>
            <option value="Rumah">Rumah</option>
            <option value="Ruko">Ruko</option>
            <option value="Apartemen">Apartemen</option>
            <option value="Tanah">Tanah</option>
          </select>
          <select
            name="budget_range"
            value={filter.budget_range}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:text-black"
          >
            <option value="">Budget</option>
            <option value="< 500jt">{'< 500jt'}</option>
            <option value="500jt - 1M">500jt - 1M</option>
            <option value="> 1M">{'>'} 1M</option>
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 w-full">
          <select
            name="lead_status"
            value={filter.lead_status}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:text-black"
          >
            <option value="">Status</option>
            <option value="New Lead">New Lead</option>
            <option value="Contacted">Contacted</option>
            <option value="Meeting Scheduled">Meeting Scheduled</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Deal Won">Deal Won</option>
            <option value="Deal Lost">Deal Lost</option>
          </select>
          <select
            name="source"
            value={filter.source}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:text-black"
          >
            <option value="">Sumber</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Marketplace">Marketplace</option>
            <option value="Ads (Google/Facebook)">Ads (Google/Facebook)</option>
          </select>
          <select
            name="priority"
            value={filter.priority}
            onChange={handleFilterChange}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:text-black"
          >
            <option value="">Prioritas</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
          <div />
        </div>
      </div>
      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">📋 Client List</h3>
        </div>
        <div className="w-full overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : (
            <table className="w-full min-w-[900px] text-sm md:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Address</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Project Name</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Property Type</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Budget Range</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Lead Status</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Source</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Priority</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Notes</th>
                  <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition">
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[160px] truncate">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[120px] truncate">
                      <div className="text-sm text-gray-500">{client.phone || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[180px] truncate">
                      <div className="text-sm text-gray-500">{client.address || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[160px] truncate">
                      <div className="text-sm text-gray-500">{client.project_name || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[120px] truncate">
                      <div className="text-sm text-gray-500">{client.property_type || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[120px] truncate">
                      <div className="text-sm text-gray-500">{client.budget_range || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[120px] truncate">
                      <div className="text-sm text-gray-500">{client.lead_status || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[120px] truncate">
                      <div className="text-sm text-gray-500">{client.source || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap max-w-[120px] truncate">
                      <div className="text-sm text-gray-500">{client.priority || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 max-w-[200px] truncate">
                      <div className="text-sm text-gray-500">{client.notes || '-'}</div>
                    </td>
                    <td className="px-2 md:px-4 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                          onClick={() => handleEdit(client)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                          onClick={() => handleDelete(client.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                      📭 No clients found.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg relative border border-gray-100">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
            >
              <span className="text-2xl">&times;</span>
            </button>
            <h2 className="text-xl font-semibold mb-6">
              {editingId ? "Edit Client" : "Add Client"}
            </h2>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    name="name"
                    value={form.name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    name="phone"
                    value={form.phone || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                    maxLength={13}
                    pattern="[0-9]*"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    name="address"
                    value={form.address || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    name="project_name"
                    value={form.project_name || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                  <select
                    name="property_type"
                    value={form.property_type || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  >
                    <option value="">Pilih tipe properti</option>
                    <option value="Rumah">Rumah</option>
                    <option value="Ruko">Ruko</option>
                    <option value="Apartemen">Apartemen</option>
                    <option value="Tanah">Tanah</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                  <select
                    name="budget_range"
                    value={form.budget_range || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  >
                    <option value="">Pilih budget</option>
                    <option value="< 500jt">{'< 500jt'}</option>
                    <option value="500jt - 1M">500jt - 1M</option>
                    <option value="> 1M">{'>'} 1M</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status</label>
                  <select
                    name="lead_status"
                    value={form.lead_status || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <select
                    name="source"
                    value={form.source || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={form.priority || ""}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  >
                    <option value="">Pilih prioritas</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes || ""}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  className="w-full px-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 focus:ring-2 focus:ring-black focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? "⏳ Saving..." : editingId ? "💾 Update Client" : "✨ Add Client"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    onClick={() => {
                      setEditingId(null);
                      setForm({});
                      setShowModal(false);
                    }}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
