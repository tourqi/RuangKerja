"use client";
import React, { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { addProject, updateProject, deleteProject } from "@/services/projects";
import { Project, ProjectStatus } from "@/types/db";

const statusOptions: ProjectStatus[] = ["Design", "Production", "Installation", "Done"];

const statusColors: Record<string, string> = {
  Design: "bg-blue-100 text-blue-800",
  Production: "bg-yellow-100 text-yellow-800",
  Installation: "bg-purple-100 text-purple-800",
  Done: "bg-green-100 text-green-800",
};

const formatCurrency = (value?: number) => {
  if (!value) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);
};

export default function ProjectsTable() {
  const { projects, loading, error, refetch } = useProjects();
  const { clients } = useClients();
  const [form, setForm] = useState<Partial<Project>>({ status: "Design" });
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
      await addProject({
        name: form.name || "",
        client_id: form.client_id,
        budget: form.budget ? Number(form.budget) : undefined,
        status: form.status as ProjectStatus,
        deadline: form.deadline,
      });
      setForm({ status: "Design" });
      setShowModal(false);
      refetch();
    } catch {
      alert("Gagal menambah project");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setForm(project);
    setShowModal(true);
  };

  const handleUpdate = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await updateProject(editingId, form);
      setEditingId(null);
      setForm({ status: "Design" });
      setShowModal(false);
      refetch();
    } catch {
      alert("Gagal update project");
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
      await deleteProject(deletingId);
      refetch();
    } catch {
      alert("Gagal hapus project");
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
      setDeletingId(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );

  if (error)
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">Error: {error}</div>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{projects.length} project</p>
        <button
          className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-medium"
          onClick={() => { setEditingId(null); setForm({ status: "Design" }); setShowModal(true); }}
        >
          + Tambah Project
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-800">Daftar Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Nama Project", "Client", "Budget", "Status", "Deadline", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((project) => {
                const client = clients.find((c) => c.id === project.client_id);
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">{project.name}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{client?.name || "-"}</td>
                    <td className="px-5 py-3 text-gray-700 font-medium whitespace-nowrap">{formatCurrency(project.budget)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[project.status] || "bg-gray-100 text-gray-700"}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{project.deadline || "-"}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs font-medium bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition"
                          onClick={() => handleEdit(project)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition"
                          onClick={() => confirmDelete(project.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Belum ada project. Klik "Tambah Project" untuk memulai.
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Project" : "Tambah Project Baru"}
              </h2>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                onClick={() => { setShowModal(false); setEditingId(null); setForm({ status: "Design" }); }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project <span className="text-red-500">*</span></label>
                  <input
                    name="name"
                    value={form.name || ""}
                    onChange={handleChange}
                    required
                    placeholder="Nama project"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select
                    name="client_id"
                    value={form.client_id || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Pilih Client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget (Rp)</label>
                  <input
                    name="budget"
                    value={form.budget || ""}
                    onChange={handleChange}
                    type="number"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
                  <select
                    name="status"
                    value={form.status || "Design"}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    name="deadline"
                    value={form.deadline || ""}
                    onChange={handleChange}
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Project"}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                  onClick={() => { setShowModal(false); setEditingId(null); setForm({ status: "Design" }); }}
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
            <h3 className="text-base font-semibold text-gray-900 mb-2">Hapus Project?</h3>
            <p className="text-sm text-gray-500 mb-5">Data project ini akan dihapus permanen.</p>
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
