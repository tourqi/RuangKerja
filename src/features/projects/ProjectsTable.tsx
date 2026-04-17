"use client";
import React, { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { addProject, updateProject, deleteProject } from '@/services/projects';
import { Project, ProjectStatus } from '@/types/db';

const statusOptions: ProjectStatus[] = ['Design', 'Production', 'Installation', 'Done'];

export default function ProjectsTable() {
  const { projects, loading, error } = useProjects();
  const { clients } = useClients();
  const [form, setForm] = useState<Partial<Project>>({ status: 'Design' });
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
      await addProject({
        name: form.name || '',
        client_id: form.client_id,
        budget: form.budget ? Number(form.budget) : undefined,
        status: form.status as ProjectStatus,
        deadline: form.deadline,
      });
      setForm({ status: 'Design' });
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to add project');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setForm(project);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateProject(editingId, form);
      setEditingId(null);
      setForm({ status: 'Design' });
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    setSaving(true);
    try {
      await deleteProject(id);
      setRefresh((r) => r + 1);
    } catch (err) {
      alert('Failed to delete project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <form onSubmit={editingId ? handleUpdate : handleAdd} className="mb-6 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <input name="name" value={form.name || ''} onChange={handleChange} placeholder="Project Name" className="input input-bordered flex-1" required />
          <select name="client_id" value={form.client_id || ''} onChange={handleChange} className="input input-bordered flex-1">
            <option value="">Select Client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <input name="budget" value={form.budget || ''} onChange={handleChange} placeholder="Budget" type="number" className="input input-bordered flex-1" />
          <select name="status" value={form.status || 'Design'} onChange={handleChange} className="input input-bordered flex-1">
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <input name="deadline" value={form.deadline || ''} onChange={handleChange} placeholder="Deadline" type="date" className="input input-bordered flex-1" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>{editingId ? 'Update' : 'Add'} Project</button>
        {editingId && <button type="button" className="btn ml-2" onClick={() => { setEditingId(null); setForm({ status: 'Design' }); }}>Cancel</button>}
      </form>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Project Name</th>
            <th className="border px-4 py-2">Client</th>
            <th className="border px-4 py-2">Budget</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Deadline</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const client = clients.find((c) => c.id === project.client_id);
            return (
              <tr key={project.id}>
                <td className="border px-4 py-2">{project.name}</td>
                <td className="border px-4 py-2">{client?.name || '-'}</td>
                <td className="border px-4 py-2">{project.budget}</td>
                <td className="border px-4 py-2">{project.status}</td>
                <td className="border px-4 py-2">{project.deadline}</td>
                <td className="border px-4 py-2">
                  <button className="btn btn-xs btn-outline mr-2" onClick={() => handleEdit(project)}>Edit</button>
                  <button className="btn btn-xs btn-error" onClick={() => handleDelete(project.id)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
