"use client";
import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from "react";
import { Project, ProjectStatus, Client } from "@/types/db";
import { addProject, updateProject } from "@/services/projects";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
import { useToast } from "@/components/Toast";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
} from "@/constants/options";

type Props = {
  project?: Project | null;
  wonClients: Client[];
  allClients?: Client[];
  autoClientId?: string | null;
  autoLeadId?: string | null;
  onSaved: () => void;
  onClose: () => void;
};

const PROJECT_COLUMNS: (keyof Project)[] = [
  "client_id", "lead_id", "name", "value", "status", "start_date", "deadline", "assigned_to", "progress",
];

export function ProjectFormModal({
  project,
  wonClients,
  allClients,
  autoClientId,
  autoLeadId,
  onSaved,
  onClose,
}: Props) {
  const toast = useToast();
  const isEditing = !!project;

  const [form, setForm] = useState<Partial<Project>>(
    project ?? { status: "Planning", progress: 0 }
  );
  const [saving, setSaving] = useState(false);
  const [clientQuery, setClientQuery] = useState(() => {
    if (!project?.client_id) return "";
    return wonClients.find((c) => c.id === project.client_id)?.name ?? "";
  });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!autoClientId || isEditing) return;
    const client =
      wonClients.find((c) => c.id === autoClientId) ??
      allClients?.find((c) => c.id === autoClientId);
    if (!client) return;
    setForm((prev) => ({ ...prev, client_id: client.id, lead_id: autoLeadId ?? undefined }));
    setClientQuery(client.name ?? "");

    if (autoLeadId) {
      (async () => {
        try {
          const rabs = await getRabByLead(autoLeadId);
          const approvedRabs = rabs.filter((r) => r.status === "approved");
          let total = 0;
          for (const rab of approvedRabs) {
            const groups = await getRabWithGroups(rab.id);
            const gross = groups.reduce(
              (s, g) => s + (g.items ?? []).reduce((gs, item) => gs + item.qty * item.harga, 0),
              0
            );
            total += gross - (rab.diskon_nilai ?? 0);
          }
          if (total > 0) {
            setForm((prev) => ({ ...prev, value: total }));
          }
        } catch {
          // silently ignore; user can fill value manually
        }
      })();
    }
  }, [autoClientId, autoLeadId, isEditing, wonClients, allClients]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "value" || name === "progress" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  const buildPayload = () => {
    const payload = Object.fromEntries(
      PROJECT_COLUMNS
        .filter((k) => form[k] !== undefined && form[k] !== "")
        .map((k) => [k, form[k]])
    ) as Omit<Project, "id" | "created_at">;
    payload.status = (form.status || "Planning") as ProjectStatus;
    return payload;
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name) { toast("Nama project wajib diisi", "warning"); return; }
    setSaving(true);
    try {
      if (isEditing) {
        await updateProject(project.id, buildPayload());
        toast("Project berhasil diperbarui", "success");
      } else {
        await addProject(buildPayload());
        toast("Project berhasil ditambahkan", "success");
      }
      onSaved();
    } catch (err: unknown) {
      const pg = err as { message?: string };
      toast(`Gagal ${isEditing ? "update" : "menambah"} project: ${pg?.message || "Terjadi kesalahan"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Project" : "Tambah Project Baru"}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
            onClick={onClose}
          >✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Nama Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Project <span className="text-red-500">*</span></label>
            <input
              name="name"
              value={form.name || ""}
              onChange={handleChange}
              required
              placeholder="Nama project"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Client autocomplete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client (Lead Deal)</label>
            <div className="relative">
              <input
                type="text"
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setShowDropdown(true);
                  setForm((prev) => ({ ...prev, client_id: "" }));
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Cari nama client..."
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
              />
              {showDropdown && (
                <div className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow max-h-48 overflow-y-auto">
                  {wonClients.filter((c) => !clientQuery || c.name?.toLowerCase().includes(clientQuery.toLowerCase())).length === 0 ? (
                    <div className="px-3 py-2 text-gray-400 text-sm">
                      {wonClients.length === 0 ? "Belum ada lead dengan status Deal." : "Tidak ditemukan"}
                    </div>
                  ) : (
                    wonClients
                      .filter((c) => !clientQuery || c.name?.toLowerCase().includes(clientQuery.toLowerCase()))
                      .map((c) => (
                        <div
                          key={c.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-green-50 text-sm ${form.client_id === c.id ? "bg-green-100" : ""}`}
                          onMouseDown={() => {
                            setForm((prev) => ({ ...prev, client_id: c.id }));
                            setClientQuery(c.name ?? "");
                            setShowDropdown(false);
                          }}
                        >
                          {c.name}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
            {form.client_id && <p className="text-xs text-green-600 mt-1">✓ Client dipilih</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nilai Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Project (Rp)</label>
              <input name="value" value={form.value ?? ""} onChange={handleChange} type="number" min={0} placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status <span className="text-red-500">*</span></label>
              <select name="status" value={form.status || "Planning"} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500">
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input name="start_date" value={form.start_date || ""} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input name="deadline" value={form.deadline || ""} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <input name="assigned_to" value={form.assigned_to || ""} onChange={handleChange} placeholder="Nama tim / PIC" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            {/* Progress */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress <span className="text-gray-400 font-normal">({form.progress ?? 0}%)</span>
              </label>
              <input name="progress" value={form.progress ?? 0} onChange={handleChange} type="range" min={0} max={100} step={5} className="w-full accent-green-600" />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50">
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Project"}
            </button>
            <button type="button" className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
