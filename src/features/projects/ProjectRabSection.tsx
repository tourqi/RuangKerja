"use client";
import Link from "next/link";
import { useState } from "react";
import { addRab, deleteRab, duplicateRab, updateRab } from "@/services/rab";
import { useToast } from "@/components/Toast";
import { ActionDropdown } from "@/components/ActionDropdown";
import type { Invoice, Rab, RabGroup } from "@/types/db";
import { formatIDR } from "@/utils/format";
import { RAB_STATUS_TONE } from "@/components/ui/StatusDot";


const formatDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

export const rabGross = (groups: RabGroup[] = []) =>
  groups.reduce((s, g) => s + (g.items ?? []).reduce((ss, it) => ss + it.qty * it.harga, 0), 0);

export function ProjectRabSection({
  projectId,
  leadId,
  rabs,
  groupsByRab,
  invoices,
  loading,
  onChanged,
}: {
  projectId: string;
  leadId?: string;
  rabs: Rab[];
  groupsByRab: Record<string, RabGroup[]>;
  invoices: Invoice[];
  loading: boolean;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (!leadId) {
    return (
      <div className="bg-white rounded-md border border-line p-12 text-center">
        <p className="text-faint text-sm">Project ini belum terhubung ke lead, jadi RAB belum bisa dibuat.</p>
      </div>
    );
  }

  const editorHref = (rabId: string) => `/leads/${leadId}/rab/${rabId}?project=${projectId}`;

  function isRabLunas(rabId: string) {
    const rabInvoices = invoices.filter((inv) => inv.rab_id === rabId);
    return rabInvoices.length > 0 && rabInvoices.every((inv) => inv.status === "paid");
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!leadId || !newNama.trim()) return;
    setSaving(true);
    try {
      await addRab(leadId, newNama.trim());
      await onChanged();
      setNewNama("");
      setShowAdd(false);
      toast("RAB berhasil dibuat", "success");
    } catch (err: unknown) {
      toast(`Gagal membuat RAB: ${(err as Error)?.message ?? String(err)}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(rab: Rab, status: Rab["status"]) {
    if (isRabLunas(rab.id)) {
      toast("RAB sudah lunas dan tidak dapat diubah", "warning");
      return;
    }
    try {
      await updateRab(rab.id, { status });
      await onChanged();
      toast("Status RAB diperbarui", "success");
    } catch {
      toast("Gagal memperbarui status", "error");
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    try {
      await duplicateRab(id);
      await onChanged();
      toast("RAB berhasil diduplikasi", "success");
    } catch (err: unknown) {
      toast(`Gagal menduplikasi RAB: ${(err as Error)?.message ?? String(err)}`, "error");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (isRabLunas(id)) {
      toast("RAB sudah lunas dan tidak dapat dihapus", "warning");
      return;
    }
    setDeletingId(id);
    try {
      await deleteRab(id);
      await onChanged();
      toast("RAB dihapus", "success");
    } catch {
      toast("Gagal menghapus RAB", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Hanya RAB berstatus <span className="font-medium text-ink">Disetujui</span> yang dihitung sebagai Nilai Project.
      </p>

      {/* Tambah RAB */}
      <div className="bg-white rounded-md border border-line p-4">
        {showAdd ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              autoFocus
              type="text"
              placeholder="Nama RAB, misal: RAB V1"
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 border border-line rounded-md px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newNama.trim()}
                className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover disabled:opacity-50 transition"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewNama(""); }}
                className="px-4 py-2 text-sm text-muted hover:text-ink transition"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm text-muted hover:text-ink transition"
          >
            <span className="text-lg leading-none">+</span> Buat RAB Baru
          </button>
        )}
      </div>

      {/* Daftar RAB */}
      {loading ? (
        <div className="py-10 text-center text-xs text-faint">Memuat RAB…</div>
      ) : rabs.length === 0 ? (
        <div className="bg-white rounded-md border border-line p-12 text-center">
          <p className="text-faint text-sm">Belum ada RAB untuk project ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rabs.map((rab) => {
            const lunas = isRabLunas(rab.id);
            const groups = groupsByRab[rab.id] ?? [];
            const gross = rabGross(groups);
            const total = gross - (rab.diskon_nilai ?? 0);
            const isExpanded = expandedIds.has(rab.id);
            return (
              <div key={rab.id} className="bg-white rounded-md border border-line overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <button onClick={() => toggleExpand(rab.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                    <svg
                      className={`w-4 h-4 text-faint shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-ink truncate">{rab.nama}</p>
                        {lunas && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-line text-success shrink-0">
                            ✓ Lunas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-faint mt-0.5">
                        Dibuat {formatDate(rab.created_at)} · <span className="font-mono tabular-nums text-ink">{formatIDR(total)}</span>
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <select
                      value={rab.status}
                      onChange={(e) => handleStatusChange(rab, e.target.value as Rab["status"])}
                      disabled={lunas}
                      title={lunas ? "RAB sudah lunas, status tidak dapat diubah" : undefined}
                      className={`text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 tone-${RAB_STATUS_TONE[rab.status] ?? "neutral"}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Terkirim</option>
                      <option value="approved">Disetujui</option>
                    </select>
                    <Link
                      href={editorHref(rab.id)}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent-hover transition-colors"
                    >
                      Edit
                    </Link>

                    {/* Desktop: Duplikasi & Hapus sebagai tombol terpisah */}
                    <button
                      onClick={() => handleDuplicate(rab.id)}
                      disabled={duplicatingId === rab.id}
                      title="Duplikasi RAB (untuk membuat penawaran harga alternatif dengan komponen yang sama)"
                      className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium text-ink border border-line rounded-md hover:bg-hover transition-colors disabled:opacity-50"
                    >
                      {duplicatingId === rab.id ? "..." : "Duplikasi"}
                    </button>
                    <button
                      onClick={() => handleDelete(rab.id)}
                      disabled={deletingId === rab.id || lunas}
                      title={lunas ? "RAB sudah lunas dan tidak dapat dihapus" : undefined}
                      className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-soft rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      {deletingId === rab.id ? "..." : "Hapus"}
                    </button>

                    {/* Mobile: Duplikasi & Hapus digabung jadi satu dropdown */}
                    <div className="sm:hidden">
                      <ActionDropdown
                        align="right"
                        label="⋯"
                        buttonClassName="px-2.5 py-1.5 text-sm font-medium text-muted border border-line rounded-md hover:bg-hover hover:text-ink transition"
                        items={[
                          {
                            key: "duplicate",
                            label: duplicatingId === rab.id ? "Menduplikasi..." : "Duplikasi",
                            disabled: duplicatingId === rab.id,
                            onClick: () => handleDuplicate(rab.id),
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            ),
                          },
                          {
                            key: "delete",
                            label: deletingId === rab.id ? "Menghapus..." : "Hapus",
                            disabled: deletingId === rab.id || lunas,
                            danger: true,
                            onClick: () => handleDelete(rab.id),
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Preview isi RAB */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-line">
                    {groups.length === 0 ? (
                      <p className="text-xs text-faint py-4 text-center">
                        Belum ada item pada RAB ini.{" "}
                        <Link href={editorHref(rab.id)} className="text-ink underline">Isi RAB</Link>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {groups.map((group) => {
                          const groupTotal = (group.items ?? []).reduce((s, it) => s + it.qty * it.harga, 0);
                          return (
                            <div key={group.id}>
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-xs font-semibold text-muted">
                                  {group.no}. {group.deskripsi}
                                </span>
                                <span className="text-xs font-semibold text-ink">{formatIDR(groupTotal)}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] text-xs">
                                  <thead>
                                    <tr className="border-b border-line">
                                      <th className="text-left py-1.5 text-faint font-medium pr-3">Spesifikasi</th>
                                      <th className="text-right py-1.5 text-faint font-medium w-16">Qty</th>
                                      <th className="text-left py-1.5 text-faint font-medium w-14 pl-1">Sat</th>
                                      <th className="text-right py-1.5 text-faint font-medium w-28">Harga</th>
                                      <th className="text-right py-1.5 text-faint font-medium w-28">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-line">
                                    {(group.items ?? []).map((item) => (
                                      <tr key={item.id}>
                                        <td className="py-1.5 text-ink pr-3">{item.spesifikasi}</td>
                                        <td className="py-1.5 text-right font-mono tabular-nums text-muted">{item.qty}</td>
                                        <td className="py-1.5 text-muted pl-1">{item.unit}</td>
                                        <td className="py-1.5 text-right font-mono tabular-nums text-muted">{formatIDR(item.harga)}</td>
                                        <td className="py-1.5 text-right font-mono tabular-nums font-medium text-ink">{formatIDR(item.qty * item.harga)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t border-line pt-2 space-y-1 text-xs">
                          <div className="flex justify-between text-muted">
                            <span>Subtotal</span>
                            <span>{formatIDR(gross)}</span>
                          </div>
                          {(rab.diskon_nilai ?? 0) > 0 && (
                            <div className="flex justify-between text-danger">
                              <span>Diskon{rab.diskon_persen ? ` (${rab.diskon_persen}%)` : ""}</span>
                              <span>- {formatIDR(rab.diskon_nilai ?? 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold text-ink text-sm pt-1">
                            <span>Total</span>
                            <span>{formatIDR(total)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
