"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/services/supabase";
import type { Profile, UserRole } from "@/types/db";
import { useToast } from "@/components/Toast";
import { DialogA11y } from "@/components/DialogA11y";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "designer", label: "Designer" },
  { value: "sales", label: "Sales" },
];

export default function UsersSettings() {
  const { profile: currentProfile } = useAuth();
  const toast = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("sales");
  const [inviting, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setProfiles(data as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  async function handleRoleChange(id: string, role: UserRole) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) {
      toast("Gagal mengubah role", "error");
    } else {
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
      toast("Role berhasil diubah", "success");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal mengundang pengguna");
      toast(`Undangan dikirim ke ${inviteEmail}`, "success");
      setShowInvite(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("sales");
      await fetchProfiles();
    } catch (err: unknown) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (currentProfile?.role !== "owner") {
    return (
      <div className="text-center py-16 text-sm text-faint">
        Hanya owner yang bisa mengakses halaman ini.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Kelola Pengguna</h1>
          <p className="text-sm text-muted mt-1">Tambah dan atur hak akses anggota tim</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Undang Pengguna
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-hover rounded-md animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-md border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Nama</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">
                    {p.name ?? "—"}
                    {p.id === currentProfile?.id && (
                      <span className="ml-2 text-[10px] bg-hover text-muted px-1.5 py-0.5 rounded">Anda</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{p.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    {p.id === currentProfile?.id ? (
                      <span className="text-xs font-medium text-ink capitalize">{p.role}</span>
                    ) : (
                      <select
                        value={p.role}
                        onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                        className="text-xs px-2 py-1 border border-line rounded-md outline-none focus:ring-2 focus:ring-accent/25 capitalize"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {profiles.length === 0 && (
            <div className="py-12 text-center text-sm text-faint">Belum ada pengguna</div>
          )}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowInvite(false)}
        >
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <DialogA11y onClose={() => setShowInvite(false)} />
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-ink">Undang Pengguna Baru</h2>
              <button onClick={() => setShowInvite(false)} className="text-faint hover:text-muted transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="users-settings-email" className="block text-xs font-medium text-ink mb-1.5">Email</label>
                <input id="users-settings-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  placeholder="nama@perusahaan.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="users-settings-nama" className="block text-xs font-medium text-ink mb-1.5">Nama</label>
                <input id="users-settings-nama"
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label htmlFor="users-settings-role" className="block text-xs font-medium text-ink mb-1.5">Peran</label>
                <select id="users-settings-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-line-strong rounded-md text-sm text-ink outline-none focus:ring-2 focus:ring-accent/25"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-muted bg-hover rounded-md hover:bg-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {inviting ? "Mengirim…" : "Kirim Undangan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
