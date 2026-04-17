"use client";
import React, { useState } from 'react';
import { useClients } from '@/hooks/useClients';
import { addClient, updateClient, deleteClient } from '@/services/clients';
import { Client } from '@/types/db';

export default function ClientsTable() {
  const { clients, loading, error } = useClients();
  const [form, setForm] = useState<Partial<Client>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [saving, setSaving] = useState(false);

  // Refresh data after CRUD
  React.useEffect(() => {
    // ...existing code...
  }, [refresh]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addClient({
        name: form.name || '',
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      });
      setForm({});
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to add client');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setForm(client);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateClient(editingId, form);
      setEditingId(null);
      setForm({});
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    setSaving(true);
    try {
      await deleteClient(id);
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to delete client');
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
          <input name="name" value={form.name || ''} onChange={handleChange} placeholder="Name" className="input input-bordered flex-1" required />
          <input name="phone" value={form.phone || ''} onChange={handleChange} placeholder="Phone" className="input input-bordered flex-1" />
          <input name="address" value={form.address || ''} onChange={handleChange} placeholder="Address" className="input input-bordered flex-1" />
        </div>
        <textarea name="notes" value={form.notes || ''} onChange={handleChange} placeholder="Notes" className="input input-bordered w-full" />
        <button type="submit" className="btn btn-primary" disabled={saving}>{editingId ? 'Update' : 'Add'} Client</button>
        {editingId && <button type="button" className="btn ml-2" onClick={() => { setEditingId(null); setForm({}); }}>Cancel</button>}
      </form>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Phone</th>
            <th className="border px-4 py-2">Address</th>
            <th className="border px-4 py-2">Notes</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td className="border px-4 py-2">{client.name}</td>
              <td className="border px-4 py-2">{client.phone}</td>
              <td className="border px-4 py-2">{client.address}</td>
              <td className="border px-4 py-2">{client.notes}</td>
              <td className="border px-4 py-2">
                <button className="btn btn-xs btn-outline mr-2" onClick={() => handleEdit(client)}>Edit</button>
                <button className="btn btn-xs btn-error" onClick={() => handleDelete(client.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
