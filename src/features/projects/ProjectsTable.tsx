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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
      Error: {error}
    </div>
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Design': 'bg-blue-100 text-blue-800',
      'Production': 'bg-yellow-100 text-yellow-800',
      'Installation': 'bg-purple-100 text-purple-800',
      'Done': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {editingId ? '✏️ Edit Project' : '➕ Add New Project'}
        </h3>
        <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input 
                name="name" 
                value={form.name || ''} 
                onChange={handleChange} 
                placeholder="Project name" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
              <select 
                name="client_id" 
                value={form.client_id || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
              <input 
                name="budget" 
                value={form.budget || ''} 
                onChange={handleChange} 
                placeholder="0" 
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <select 
                name="status" 
                value={form.status || 'Design'} 
                onChange={handleChange} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input 
                name="deadline" 
                value={form.deadline || ''} 
                onChange={handleChange} 
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              type="submit" 
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? '⏳ Saving...' : (editingId ? '💾 Update Project' : '✨ Add Project')}
            </button>
            {editingId && (
              <button 
                type="button" 
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                onClick={() => { setEditingId(null); setForm({ status: 'Design' }); }}
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
          <h3 className="text-lg font-semibold text-gray-800">📁 Projects List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => {
                const client = clients.find((c) => c.id === project.client_id);
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{client?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(project.budget)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{project.deadline || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button 
                          className="px-3 py-1 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 transition"
                          onClick={() => handleEdit(project)}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                          onClick={() => handleDelete(project.id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    📭 No projects yet. Add your first project above!
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
