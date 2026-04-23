"use client";
import { useState } from "react";
import { useActivityLog } from "@/hooks/useActivityLog";
import { logActivity, type ActivityLog } from "@/services/activityLog";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

const ACTION_ICONS: Record<string, string> = {
  created: "●",
  status_changed: "⇄",
  note_added: "✎",
  updated: "✎",
  payment_added: "₫",
  payment_deleted: "✕",
};

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700",
  status_changed: "bg-blue-100 text-blue-700",
  note_added: "bg-gray-100 text-gray-600",
  updated: "bg-gray-100 text-gray-600",
  payment_added: "bg-emerald-100 text-emerald-700",
  payment_deleted: "bg-red-100 text-red-600",
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
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  entityType: ActivityLog["entity_type"];
  entityId: string;
}

export default function ActivityTimeline({ entityType, entityId }: Props) {
  const { logs, loading, refetch } = useActivityLog(entityType, entityId);
  const { user, profile } = useAuth();
  const toast = useToast();

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

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
    } catch {
      toast("Gagal menyimpan catatan", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100"
      >
        <h3 className="text-sm font-semibold text-gray-900">
          Riwayat Aktivitas {logs.length > 0 && <span className="text-gray-400 font-normal">({logs.length})</span>}
        </h3>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              type="submit"
              disabled={!note.trim() || saving}
              className="px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {saving ? "…" : "Simpan"}
            </button>
          </form>

          {/* Timeline */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada aktivitas tercatat</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-100" />
              <div className="space-y-4">
                {logs.map((log) => {
                  const icon = ACTION_ICONS[log.action] ?? "●";
                  const color = ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600";
                  return (
                    <div key={log.id} className="flex gap-3 relative">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 z-10 ${color}`}>
                        {icon}
                      </span>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-xs text-gray-800 leading-relaxed">{log.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {log.user_name && (
                            <span className="text-[10px] text-gray-400">{log.user_name}</span>
                          )}
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">{timeAgo(log.created_at)}</span>
                        </div>
                      </div>
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
