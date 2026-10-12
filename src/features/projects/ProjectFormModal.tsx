"use client";
import { useState, useEffect, type ChangeEvent, type SyntheticEvent } from "react";
import { Project, ProjectStatus, Client, Lead } from "@/types/db";
import { addProject, updateProject } from "@/services/projects";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
import { useLeads } from "@/hooks/useLeads";
import { useProjects } from "@/hooks/useProjects";
import { useToast } from "@/components/Toast";
import { NumberInput } from "@/components/NumberInput";
import { Select } from "@/components/Select";
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  toOptions,
} from "@/constants/options";
import { formatDate } from "@/utils/format";
import { DialogA11y } from "@/components/DialogA11y";

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

/** Project name is derived from the lead — falls back to a dated label when the lead has none. */
function leadDisplayName(l: Lead): string {
  return l.project_name || `Lead ${l.created_at ? formatDate(l.created_at) : l.id.slice(0, 8)}`;
}

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
  const { leads } = useLeads();
  const { projects } = useProjects();

  // Project sekarang dinamai dari lead-nya — cegah satu lead/nama dipakai lebih dari satu project,
  // termasuk terhadap project yang sudah Selesai (bukan cuma yang masih berjalan).
  const otherProjects = projects.filter((p) => !isEditing || p.id !== project?.id);
  const usedLeadIds = new Set(otherProjects.map((p) => p.lead_id).filter(Boolean) as string[]);
  const usedNames = new Set(otherProjects.map((p) => p.name?.trim().toLowerCase()).filter(Boolean) as string[]);

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
    const autoLead = autoLeadId ? leads.find((l) => l.id === autoLeadId) : undefined;
    setForm((prev) => ({
      ...prev,
      client_id: client.id,
      lead_id: autoLeadId ?? undefined,
      name: autoLead ? leadDisplayName(autoLead) : prev.name,
    }));
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
  }, [autoClientId, autoLeadId, isEditing, wonClients, allClients, leads]);

  const leadsForClient = leads.filter(
    (l) => l.client_id === form.client_id && l.status === "Deal Won"
  );

  async function handleLeadSelect(leadId: string) {
    if (leadId && usedLeadIds.has(leadId)) {
      toast("Lead ini sudah punya project — tidak bisa dipakai lagi untuk project baru", "warning");
      return;
    }
    const lead = leadsForClient.find((l) => l.id === leadId);
    setForm((prev) => ({ ...prev, lead_id: leadId || undefined, name: lead ? leadDisplayName(lead) : prev.name }));
    if (!leadId) return;
    try {
      const rabs = await getRabByLead(leadId);
      const approved = rabs.filter((r) => r.status === "approved");
      let total = 0;
      for (const rab of approved) {
        const groups = await getRabWithGroups(rab.id);
        const gross = groups.reduce((s, g) => s + (g.items ?? []).reduce((gs, it) => gs + it.qty * it.harga, 0), 0);
        total += gross - (rab.diskon_nilai ?? 0);
      }
      if (total > 0) setForm((prev) => ({ ...prev, lead_id: leadId, value: total }));
    } catch { /* silent */ }
  }

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
    if (!form.name) { toast("Pilih lead untuk menentukan nama project", "warning"); return; }
    if (form.lead_id && usedLeadIds.has(form.lead_id)) {
      toast("Lead ini sudah punya project — tidak bisa dipakai lagi untuk project baru", "warning");
      return;
    }
    if (usedNames.has(form.name.trim().toLowerCase())) {
      toast(`Nama project "${form.name}" sudah dipakai, tidak boleh duplikat`, "warning");
      return;
    }
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogA11y onClose={onClose} />
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            {isEditing ? "Edit Project" : "Tambah Project Baru"}
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition"
            onClick={onClose}
          >✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Client autocomplete */}
          <div>
            <label htmlFor="project-form-modal-client-lead-deal-won" className="block text-sm font-medium text-ink mb-1">Klien (lead Deal Won)</label>
            <div className="relative">
              <input id="project-form-modal-client-lead-deal-won"
                type="text"
                value={clientQuery}
                onChange={(e) => {
                  setClientQuery(e.target.value);
                  setShowDropdown(true);
                  setForm((prev) => ({ ...prev, client_id: "", lead_id: undefined, value: undefined }));
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Cari nama client..."
                autoComplete="off"
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
              />
              {showDropdown && (
                <div className="absolute z-10 left-0 right-0 bg-white border border-line rounded-b-lg shadow max-h-48 overflow-y-auto">
                  {wonClients.filter((c) => !clientQuery || c.name?.toLowerCase().includes(clientQuery.toLowerCase())).length === 0 ? (
                    <div className="px-3 py-2 text-faint text-sm">
                      {wonClients.length === 0 ? "Belum ada lead dengan status Deal Won." : "Tidak ditemukan"}
                    </div>
                  ) : (
                    wonClients
                      .filter((c) => !clientQuery || c.name?.toLowerCase().includes(clientQuery.toLowerCase()))
                      .map((c) => (
                        <div
                          key={c.id}
                          className={`px-3 py-2 cursor-pointer hover:bg-success-soft text-sm ${form.client_id === c.id ? "bg-success-soft" : ""}`}
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
            {form.client_id && <p className="text-xs text-success mt-1">✓ Client dipilih</p>}
          </div>

          {/* Lead selector — menentukan Nama Project, muncul setelah client dipilih */}
          {form.client_id && (
            <div>
              <label htmlFor="project-form-modal-nama-project" className="block text-sm font-medium text-ink mb-1">Nama Proyek <span className="text-danger">*</span></label>
              {leadsForClient.length === 0 ? (
                <p className="text-xs text-faint mt-1">Tidak ada lead Deal Won untuk client ini</p>
              ) : (
                <Select id="project-form-modal-nama-project"
                  value={form.lead_id || ""}
                  onChange={handleLeadSelect}
                  options={leadsForClient.map((l: Lead) => ({
                    value: l.id,
                    label: usedLeadIds.has(l.id) ? `${leadDisplayName(l)} (sudah ada project)` : leadDisplayName(l),
                    disabled: usedLeadIds.has(l.id),
                  }))}
                  placeholder="— Pilih Lead —"
                />
              )}
              {form.lead_id && <p className="text-xs text-success mt-1">✓ Nama &amp; nilai project otomatis dari lead ini</p>}
              {!form.lead_id && form.name && (
                <p className="text-xs text-faint mt-1">Nama saat ini: {form.name}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nilai Project */}
            <div>
              <label htmlFor="project-form-modal-nilai-project-rp" className="block text-sm font-medium text-ink mb-1">Nilai Project (Rp)</label>
              <NumberInput id="project-form-modal-nilai-project-rp"
                value={form.value ?? ""}
                onValueChange={(v) => setForm((prev) => ({ ...prev, value: v === "" ? undefined : Number(v) }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            {/* Status */}
            <div>
              <label htmlFor="project-form-modal-status" className="block text-sm font-medium text-ink mb-1">Status <span className="text-danger">*</span></label>
              <Select id="project-form-modal-status"
                value={form.status || "Planning"}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v as ProjectStatus }))}
                options={toOptions(PROJECT_STATUSES, PROJECT_STATUS_LABELS)}
                includeEmptyOption={false}
              />
            </div>
            {/* Start Date */}
            <div>
              <label htmlFor="project-form-modal-mulai" className="block text-sm font-medium text-ink mb-1">Mulai</label>
              <input id="project-form-modal-mulai" name="start_date" value={form.start_date || ""} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
            </div>
            {/* Deadline */}
            <div>
              <label htmlFor="project-form-modal-tenggat" className="block text-sm font-medium text-ink mb-1">Tenggat</label>
              <input id="project-form-modal-tenggat" name="deadline" value={form.deadline || ""} onChange={handleChange} type="date" className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
            </div>
            {/* Assigned To */}
            <div>
              <label htmlFor="project-form-modal-pic" className="block text-sm font-medium text-ink mb-1">PIC</label>
              <input id="project-form-modal-pic" name="assigned_to" value={form.assigned_to || ""} onChange={handleChange} placeholder="Nama tim / PIC" className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25" />
            </div>
            {/* Progress */}
            <div>
              <label htmlFor="project-form-modal-progress" className="block text-sm font-medium text-ink mb-1">
                Progres <span className="text-faint font-normal">({form.progress ?? 0}%)</span>
              </label>
              <input id="project-form-modal-progress" name="progress" value={form.progress ?? 0} onChange={handleChange} type="range" min={0} max={100} step={5} className="w-full accent-green-600" />
              <div className="flex justify-between text-xs text-faint mt-0.5">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50">
              {saving ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Project"}
            </button>
            <button type="button" className="px-6 py-2 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition" onClick={onClose}>
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
