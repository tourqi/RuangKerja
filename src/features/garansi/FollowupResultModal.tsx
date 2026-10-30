"use client";
import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import type { Client, Project, WarrantyFollowup, WarrantyKondisi } from "@/types/db";
import { completeWarrantyFollowup } from "@/services/warranty";
import { addLead } from "@/services/leads";
import { useToast } from "@/components/Toast";
import { DialogA11y } from "@/components/DialogA11y";
import { WARRANTY_KONDISI_LABELS, WARRANTY_TUGAS } from "@/constants/options";
import { isUnderWarranty, localToday } from "@/utils/warranty";

type Props = {
  followup: WarrantyFollowup;
  project: Project;
  client?: Client;
  onSaved: () => void;
  onClose: () => void;
};

export function FollowupResultModal({ followup, project, client, onSaved, onClose }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [kondisi, setKondisi] = useState<WarrantyKondisi>("aman");
  const [tugasSelesai, setTugasSelesai] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [buatLead, setBuatLead] = useState(false);
  const [saving, setSaving] = useState(false);

  const tugas = WARRANTY_TUGAS[followup.bulan_ke];
  const masihGaransi = isUnderWarranty(project, localToday());
  const bisaBuatLead = kondisi === "keluhan" && !!project.client_id;

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      await completeWarrantyFollowup(followup, {
        kondisi,
        tugas_selesai: tugasSelesai,
        catatan: catatan.trim() || undefined,
      });
    } catch (err: unknown) {
      toast(`Gagal mencatat follow-up: ${(err as Error)?.message ?? "periksa koneksi lalu coba lagi"}`, "error");
      setSaving(false);
      return;
    }

    if (bisaBuatLead && buatLead) {
      // Follow-up sudah tercatat di titik ini, kegagalan di sini jangan dibaca gagal simpan.
      try {
        const lead = await addLead({
          client_id: project.client_id as string,
          status: "New Lead",
          source: "Klien Lama",
          project_name: `Perbaikan ${project.name}`,
          notes: catatan.trim() || undefined,
        });
        toast("Follow-up dicatat dan lead baru dibuat", "success");
        onSaved();
        router.push(`/leads/${lead.id}`);
        return;
      } catch (err: unknown) {
        toast(`Follow-up tercatat, tapi lead gagal dibuat: ${(err as Error)?.message ?? "periksa koneksi"}. Buat manual dari menu Leads.`, "error");
      }
    } else {
      toast("Follow-up dicatat", "success");
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogA11y onClose={onClose} />
        <div className="px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Follow-up bulan ke-{followup.bulan_ke}</h2>
          <p className="text-[13px] text-muted mt-0.5">{client?.name ?? "—"} · {project.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <fieldset>
            <legend className="block text-sm font-medium text-ink mb-1">Kondisi</legend>
            <div className="flex gap-4">
              {(Object.keys(WARRANTY_KONDISI_LABELS) as WarrantyKondisi[]).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                  <input
                    type="radio"
                    name="followup-kondisi"
                    checked={kondisi === value}
                    onChange={() => setKondisi(value)}
                    className="accent-accent"
                  />
                  {WARRANTY_KONDISI_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>
          {tugas && (
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={tugasSelesai} onChange={(e) => setTugasSelesai(e.target.checked)} className="accent-accent" />
              {tugas}
            </label>
          )}
          <div>
            <label htmlFor="followup-catatan" className="block text-sm font-medium text-ink mb-1">Catatan</label>
            <textarea
              id="followup-catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              placeholder="Hasil obrolan dengan klien"
              className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25 resize-none"
            />
          </div>
          {bisaBuatLead && (
            <label className="flex items-start gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={buatLead} onChange={(e) => setBuatLead(e.target.checked)} className="accent-accent mt-0.5" />
              <span>
                Buat lead baru dari keluhan ini
                <span className="block text-xs text-faint">
                  {masihGaransi ? "Masih dalam garansi, perbaikan biasanya tidak perlu lead." : "Garansi sudah habis, perbaikan jadi pekerjaan baru."}
                </span>
              </span>
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
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
