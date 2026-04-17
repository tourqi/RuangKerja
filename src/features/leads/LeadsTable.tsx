"use client";
import React, { useState, useEffect } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useClients } from '@/hooks/useClients';
import { addLead, updateLead, deleteLead } from '@/services/leads';
import { Lead, LeadStatus } from '@/types/db';

const statusOptions: LeadStatus[] = ['New Lead', 'Contacted', 'Survey', 'Deal', 'Lost'];

export default function LeadsTable() {
  const { leads, loading, error } = useLeads();
  const { clients } = useClients();
  const [form, setForm] = useState<Partial<Lead>>({ status: 'New Lead' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ...existing code for refresh...
  }, [refresh]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addLead({
        client_id: form.client_id!,
        status: form.status as LeadStatus,
        notes: form.notes,
      });
      setForm({ status: 'New Lead' });
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to add lead');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setForm(lead);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateLead(editingId, form);
      setEditingId(null);
      setForm({ status: 'New Lead' });
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to update lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    setSaving(true);
    try {
      await deleteLead(id);
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to delete lead');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      Error: {error}
    </div>
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'New Lead': 'bg-blue-100 text-blue-800',
      'Contacted': 'bg-yellow-100 text-yellow-800',
      'Survey': 'bg-purple-100 text-purple-800',
      'Deal': 'bg-green-100 text-green-800',
      'Lost': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {editingId ? '✏️ Edit Lead' : '➕ Add New Lead'}
        </h3>
        <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select 
                name="client_id" 
                value={form.client_id || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                required
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select 
                name="status" 
                value={form.status || 'New Lead'} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea 
              name="notes" 
              value={form.notes || ''} 
              onChange={handleChange} 
              placeholder="Lead notes..." 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="submit" 
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? '⏳ Saving...' : (editingId ? '💾 Update Lead' : '✨ Add Lead')}
            </button>
            {editingId && (
              <button 
                type="button" 
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                onClick={() => { setEditingId(null); setForm({ status: 'New Lead' }); }}
              >
                ❌ Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">🎯 Leads Pipeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => {
                const client = clients.find((c) => c.id === lead.client_id);
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{client?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 truncate max-w-xs">{lead.notes || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button 
                          className="px-3 py-1 text-sm bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition"
                          onClick={() => handleEdit(lead)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                          onClick={() => handleDelete(lead.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    📭 No leads yet. Add your first lead above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
