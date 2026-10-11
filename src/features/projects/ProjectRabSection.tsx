"use client";
import Link from "next/link";
import { useState } from "react";
import { addRab, deleteRab, duplicateRab, updateRab } from "@/services/rab";
import { useToast } from "@/components/Toast";
import { ActionDropdown } from "@/components/ActionDropdown";
import type { Invoice, Rab, RabGroup } from "@/types/db";
import { formatIDR } from "@/utils/format";

const RAB_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
};

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
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <p className="text-gray-400 text-sm">Project ini belum terhubung ke lead, jadi RAB belum bisa dibuat.</p>
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
      <p className="text-xs text-gray-400">
        Hanya RAB berstatus <span className="font-medium text-green-700">Disetujui</span> yang dihitung sebagai Nilai Project.
      </p>

      {/* Tambah RAB */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        {showAdd ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              autoFocus
              type="text"
              placeholder="Nama RAB, misal: RAB V1"
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newNama.trim()}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewNama(""); }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition"
              >
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition"
          >
            <span className="text-lg leading-none">+</span> Buat RAB Baru
          </button>
        )}
      </div>

      {/* Daftar RAB */}
      {loading ? (
        <div className="py-10 text-center text-xs text-gray-400">Memuat RAB…</div>
      ) : rabs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <p className="text-gray-400 text-sm">Belum ada RAB untuk project ini.</p>
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
              <div key={rab.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <button onClick={() => toggleExpand(rab.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
                    <svg
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{rab.nama}</p>
                        {lunas && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                            ✓ Lunas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Dibuat {formatDate(rab.created_at)} · <span className="font-semibold text-gray-700">{formatIDR(total)}</span>
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <select
                      value={rab.status}
                      onChange={(e) => handleStatusChange(rab, e.target.value as Rab["status"])}
                      disabled={lunas}
                      title={lunas ? "RAB sudah lunas, status tidak dapat diubah" : undefined}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-70 ${RAB_STATUS_COLORS[rab.status]}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Terkirim</option>
                      <option value="approved">Disetujui</option>
                    </select>
                    <Link
                      href={editorHref(rab.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                      Edit
                    </Link>

                    {/* Desktop: Duplikasi & Hapus sebagai tombol terpisah */}
                    <button
                      onClick={() => handleDuplicate(rab.id)}
                      disabled={duplicatingId === rab.id}
                      title="Duplikasi RAB (untuk membuat penawaran harga alternatif dengan komponen yang sama)"
                      className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition disabled:opacity-50"
                    >
                      {duplicatingId === rab.id ? "..." : "Duplikasi"}
                    </button>
                    <button
                      onClick={() => handleDelete(rab.id)}
                      disabled={deletingId === rab.id || lunas}
                      title={lunas ? "RAB sudah lunas dan tidak dapat dihapus" : undefined}
                      className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      {deletingId === rab.id ? "..." : "Hapus"}
                    </button>

                    {/* Mobile: Duplikasi & Hapus digabung jadi satu dropdown */}
                    <div className="sm:hidden">
                      <ActionDropdown
                        align="right"
                        label="⋯"
                        buttonClassName="px-2.5 py-1.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition"
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
                  <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-gray-50">
                    {groups.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">
                        Belum ada item pada RAB ini.{" "}
                        <Link href={editorHref(rab.id)} className="text-gray-700 underline">Isi RAB</Link>
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {groups.map((group) => {
                          const groupTotal = (group.items ?? []).reduce((s, it) => s + it.qty * it.harga, 0);
                          return (
                            <div key={group.id}>
                              <div className="flex items-center justify-between py-1.5">
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                  {group.no}. {group.deskripsi}
                                </span>
                                <span className="text-xs font-semibold text-gray-700">{formatIDR(groupTotal)}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[480px] text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="text-left py-1.5 text-gray-400 font-medium pr-3">Spesifikasi</th>
                                      <th className="text-right py-1.5 text-gray-400 font-medium w-16">Qty</th>
                                      <th className="text-left py-1.5 text-gray-400 font-medium w-14 pl-1">Sat</th>
                                      <th className="text-right py-1.5 text-gray-400 font-medium w-28">Harga</th>
                                      <th className="text-right py-1.5 text-gray-400 font-medium w-28">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {(group.items ?? []).map((item) => (
                                      <tr key={item.id}>
                                        <td className="py-1.5 text-gray-700 pr-3">{item.spesifikasi}</td>
                                        <td className="py-1.5 text-right text-gray-600">{item.qty}</td>
                                        <td className="py-1.5 text-gray-500 pl-1">{item.unit}</td>
                                        <td className="py-1.5 text-right text-gray-600">{formatIDR(item.harga)}</td>
                                        <td className="py-1.5 text-right font-medium text-gray-800">{formatIDR(item.qty * item.harga)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                          <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatIDR(gross)}</span>
                          </div>
                          {(rab.diskon_nilai ?? 0) > 0 && (
                            <div className="flex justify-between text-red-500">
                              <span>Diskon{rab.diskon_persen ? ` (${rab.diskon_persen}%)` : ""}</span>
                              <span>- {formatIDR(rab.diskon_nilai ?? 0)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-gray-900 text-sm pt-1">
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
