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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <form onSubmit={editingId ? handleUpdate : handleAdd} className="mb-6 space-y-2">
        <div className="flex gap-2">
          <select name="client_id" value={form.client_id || ''} onChange={handleChange} className="input input-bordered flex-1" required>
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <select name="status" value={form.status || 'New Lead'} onChange={handleChange} className="input input-bordered flex-1">
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <textarea name="notes" value={form.notes || ''} onChange={handleChange} placeholder="Notes" className="input input-bordered w-full" />
        <button type="submit" className="btn btn-primary" disabled={saving}>{editingId ? 'Update' : 'Add'} Lead</button>
        {editingId && <button type="button" className="btn ml-2" onClick={() => { setEditingId(null); setForm({ status: 'New Lead' }); }}>Cancel</button>}
      </form>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Client</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Notes</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const client = clients.find((c) => c.id === lead.client_id);
            return (
              <tr key={lead.id}>
                <td className="border px-4 py-2">{client?.name || '-'}</td>
                <td className="border px-4 py-2">{lead.status}</td>
                <td className="border px-4 py-2">{lead.notes}</td>
                <td className="border px-4 py-2">
                  <button className="btn btn-xs btn-outline mr-2" onClick={() => handleEdit(lead)}>Edit</button>
                  <button className="btn btn-xs btn-error" onClick={() => handleDelete(lead.id)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
