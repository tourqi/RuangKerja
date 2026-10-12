"use client";
import { useState } from "react";
import { useActivityLog } from "@/hooks/useActivityLog";
import { logActivity, deleteActivityLog, type ActivityLog } from "@/services/activityLog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/utils/format";

const ACTION_ICONS: Record<string, string> = {
  created: "●",
  status_changed: "⇄",
  note_added: "✎",
  updated: "✎",
  payment_added: "₫",
  payment_deleted: "✕",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-success-soft text-success",
  status_changed: "bg-accent-soft text-accent",
  note_added: "bg-surface text-muted",
  updated: "bg-surface text-muted",
  payment_added: "bg-success-soft text-success",
  payment_deleted: "bg-danger-soft text-danger",
};

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return formatDate(dateStr);
}

interface Props {
  entityType: ActivityLog["entity_type"];
  entityId: string;
}

export default function ActivityTimeline({ entityType, entityId }: Props) {
  const { logs, loading, error, refetch } = useActivityLog(entityType, entityId);
  const { user, profile } = useAuth();
  const toast = useToast();

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteActivityLog(id);
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`Gagal menghapus: ${msg}`, "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !user) return;
    setSaving(true);
    try {
      await logActivity({
        entity_type: entityType,
        entity_id: entityId,
        user_id: user.id,
        user_name: profile?.name ?? user.email ?? "—",
        action: "note_added",
        description: note.trim(),
      });
      setNote("");
      await refetch();
      toast("Catatan ditambahkan", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(`Gagal menyimpan catatan: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-md border border-line">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-line"
      >
        <h3 className="text-sm font-semibold text-ink">
          Riwayat Aktivitas {logs.length > 0 && <span className="text-faint font-normal">({logs.length})</span>}
        </h3>
        <svg
          className={`w-4 h-4 text-faint transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-4">
          {/* Add note form */}
          <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambah catatan aktivitas…"
              className="flex-1 px-3 py-2 text-sm text-ink border border-line rounded-md outline-none focus:ring-2 focus:ring-accent/25"
            />
            <button
              type="submit"
              disabled={!note.trim() || saving}
              className="px-3 py-2 text-xs font-medium text-white bg-accent rounded-md hover:bg-accent-hover disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {saving ? "…" : "Simpan"}
            </button>
          </form>

          {/* Timeline */}
          {error && (
            <p className="text-xs text-danger mb-3 bg-danger-soft rounded px-2 py-1">{error}</p>
          )}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-hover flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-hover rounded w-3/4" />
                    <div className="h-2.5 bg-hover rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-faint text-center py-4">Belum ada aktivitas tercatat</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3 top-3 bottom-3 w-px bg-hover" />
              <div className="space-y-4">
                {logs.map((log) => {
                  const icon = ACTION_ICONS[log.action] ?? "●";
                  const color = ACTION_COLORS[log.action] ?? "bg-surface text-muted";
                  return (
                    <div key={log.id} className="flex gap-3 relative group/log">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 z-10 ${color}`}>
                        {icon}
                      </span>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-xs text-ink leading-relaxed">{log.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {log.user_name && (
                            <span className="text-[10px] text-faint">{log.user_name}</span>
                          )}
                          <span className="text-[10px] text-faint">·</span>
                          <span className="text-[10px] text-faint">{timeAgo(log.created_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        className="opacity-0 group-hover/log:opacity-100 transition-opacity flex-shrink-0 text-faint hover:text-danger disabled:opacity-40 text-xs px-1"
                        title="Hapus aktivitas"
                      >
                        {deletingId === log.id ? "…" : "✕"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
