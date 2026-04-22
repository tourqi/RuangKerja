"use client";
import React from "react";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useToast } from "@/components/Toast";
import {
  getRabWithGroups,
  addRabGroup,
  updateRabGroup,
  deleteRabGroup,
  addRabItem,
  updateRabItem,
  deleteRabItem,
  updateRab,
} from "@/services/rab";
import { getRabByLead } from "@/services/rab";
import { Rab, RabGroup, RabItem } from "@/types/db";
import RabPrintView from "@/features/rab/RabPrintView";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

const parseCurrency = (s: string) => {
  const n = parseFloat(s.replace(/[^\d]/g, ""));
  return isNaN(n) ? 0 : n;
};

type LocalItem = Omit<RabItem, "created_at"> & { _new?: boolean };
type LocalGroup = Omit<RabGroup, "created_at" | "items"> & {
  items: LocalItem[];
  _new?: boolean;
};

let tempCounter = 0;
const tempId = () => `temp_${++tempCounter}`;

export default function RabEditor({ leadId, rabId }: { leadId: string; rabId: string }) {
  const toast = useToast();
  const [rab, setRab] = useState<Rab | null>(null);
  const [groups, setGroups] = useState<LocalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [rabName, setRabName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rabData, rawGroups] = await Promise.all([
        getRabByLead(leadId).then((list) => list.find((r) => r.id === rabId) ?? null),
        getRabWithGroups(rabId),
      ]);
      setRab(rabData);
      setRabName(rabData?.nama ?? "");
      setGroups(
        rawGroups.map((g) => ({
          id: g.id,
          rab_id: g.rab_id,
          no: g.no,
          deskripsi: g.deskripsi,
          items: (g.items ?? []).map((item) => ({ ...item })),
        }))
      );
    } catch {
      toast("Gagal memuat data RAB", "error");
    } finally {
      setLoading(false);
    }
  }, [leadId, rabId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (editingName && nameInputRef.current) nameInputRef.current.focus();
  }, [editingName]);

  // --- CALCULATIONS ---
  const groupSubtotal = (group: LocalGroup) =>
    group.items.reduce((s, item) => s + item.qty * item.harga, 0);

  const grandTotal = groups.reduce((s, g) => s + groupSubtotal(g), 0);

  // --- RAB NAME ---
  async function handleSaveName() {
    if (!rab || !rabName.trim()) return;
    try {
      await updateRab(rab.id, { nama: rabName.trim() });
      setRab({ ...rab, nama: rabName.trim() });
      setEditingName(false);
      toast("Nama RAB diperbarui", "success");
    } catch {
      toast("Gagal menyimpan nama", "error");
    }
  }

  // --- GROUP OPERATIONS ---
  async function handleAddGroup() {
    const nextNo = groups.length > 0 ? Math.max(...groups.map((g) => g.no)) + 1 : 1;
    setSaving(true);
    try {
      const created = await addRabGroup(rabId, nextNo, "Pekerjaan Baru");
      setGroups((prev) => [
        ...prev,
        { id: created.id, rab_id: rabId, no: nextNo, deskripsi: "Pekerjaan Baru", items: [] },
      ]);
    } catch {
      toast("Gagal menambah group", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm("Hapus group beserta semua item di dalamnya?")) return;
    try {
      await deleteRabGroup(groupId);
      setGroups((prev) => {
        const filtered = prev.filter((g) => g.id !== groupId);
        return filtered.map((g, i) => ({ ...g, no: i + 1 }));
      });
      toast("Group dihapus", "success");
    } catch {
      toast("Gagal menghapus group", "error");
    }
  }

  function updateGroupLocal(groupId: string, field: "no" | "deskripsi", value: string | number) {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  }

  async function handleBlurGroup(group: LocalGroup, field: "deskripsi") {
    try {
      await updateRabGroup(group.id, { [field]: group[field] });
    } catch {
      toast("Gagal menyimpan perubahan", "error");
    }
  }

  // --- ITEM OPERATIONS ---
  async function handleAddItem(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const nextOrder = group.items.length;
    setSaving(true);
    try {
      const created = await addRabItem(groupId, {
        spesifikasi: "Item Baru",
        qty: 0,
        unit: "m2",
        harga: 0,
        sort_order: nextOrder,
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, items: [...g.items, { ...created }] }
            : g
        )
      );
    } catch {
      toast("Gagal menambah item", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(groupId: string, itemId: string) {
    try {
      await deleteRabItem(itemId);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
            : g
        )
      );
    } catch {
      toast("Gagal menghapus item", "error");
    }
  }

  function updateItemLocal(
    groupId: string,
    itemId: string,
    field: keyof Omit<LocalItem, "id" | "group_id" | "_new">,
    value: string | number
  ) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.id === itemId ? { ...i, [field]: value } : i
              ),
            }
          : g
      )
    );
  }

  async function handleBlurItem(
    item: LocalItem,
    field: keyof Omit<LocalItem, "id" | "group_id" | "_new" | "created_at">
  ) {
    try {
      await updateRabItem(item.id, { [field]: item[field] });
    } catch {
      toast("Gagal menyimpan item", "error");
    }
  }

  // --- PRINT ---
  function handlePrint() {
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!rab) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href={`/leads/${leadId}`} className="text-sm text-gray-500 hover:text-gray-800">← Kembali</Link>
        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">RAB tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print view — hidden on screen, visible on print */}
      {showPrint && (
        <RabPrintView
          rab={rab}
          groups={groups}
          onClose={() => setShowPrint(false)}
        />
      )}

      <div className="p-6 max-w-6xl mx-auto space-y-6 print:hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/leads" className="hover:text-gray-700">Leads</Link>
          <span>/</span>
          <Link href={`/leads/${leadId}`} className="hover:text-gray-700">Detail Lead</Link>
          <span>/</span>
          <span className="text-gray-700">{rab.nama}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={rabName}
                    onChange={(e) => setRabName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    onBlur={handleSaveName}
                    className="text-2xl font-bold text-gray-900 border-b-2 border-gray-900 outline-none bg-transparent w-72"
                  />
                </div>
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-gray-600 transition group"
                  onClick={() => setEditingName(true)}
                >
                  {rab.nama}
                  <span className="ml-2 text-sm font-normal text-gray-400 opacity-0 group-hover:opacity-100 transition">klik untuk edit</span>
                </h1>
              )}
              <p className="text-sm text-gray-400 mt-1">
                {groups.length} section · {groups.reduce((s, g) => s + g.items.length, 0)} item
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400">Total RAB</p>
                <p className="text-xl font-bold text-gray-900">Rp {formatCurrency(grandTotal)}</p>
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition font-medium"
              >
                ⎙ Print / PDF
              </button>
            </div>
          </div>
        </div>

        {/* RAB Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-10">No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-36">Deskripsi</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Spesifikasi</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-20">QTY</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-16">Unit</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-32">Harga</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase w-32">Total</th>
                  <th className="px-3 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                      Belum ada section. Klik "+ Tambah Section" untuk mulai.
                    </td>
                  </tr>
                )}
                {groups.map((group) => (
                  <React.Fragment key={group.id}>
                    {/* Group Header Row */}
                    <tr key={`group-${group.id}`} className="bg-gray-50 border-t border-gray-200">
                      <td className="px-3 py-2 font-semibold text-gray-700 text-sm">{group.no}</td>
                      <td colSpan={5} className="px-3 py-2">
                        <input
                          type="text"
                          value={group.deskripsi}
                          onChange={(e) => updateGroupLocal(group.id, "deskripsi", e.target.value)}
                          onBlur={() => handleBlurGroup(group, "deskripsi")}
                          className="font-semibold text-gray-800 bg-transparent outline-none w-full focus:bg-white focus:px-2 focus:rounded transition"
                          placeholder="Nama section..."
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-gray-400">subtotal</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-400 hover:text-red-600 transition text-xs"
                          title="Hapus section"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>

                    {/* Items */}
                    {group.items.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors group/row">
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.spesifikasi}
                            onChange={(e) => updateItemLocal(group.id, item.id, "spesifikasi", e.target.value)}
                            onBlur={() => handleBlurItem(item, "spesifikasi")}
                            className="w-full bg-transparent outline-none text-gray-700 focus:bg-white focus:px-2 focus:rounded transition text-sm"
                            placeholder="Spesifikasi..."
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.qty || ""}
                            onChange={(e) => updateItemLocal(group.id, item.id, "qty", parseFloat(e.target.value) || 0)}
                            onBlur={() => handleBlurItem(item, "qty")}
                            className="w-full text-right bg-transparent outline-none text-gray-700 focus:bg-white focus:px-2 focus:rounded transition text-sm"
                            placeholder="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => updateItemLocal(group.id, item.id, "unit", e.target.value)}
                            onBlur={() => handleBlurItem(item, "unit")}
                            className="w-full bg-transparent outline-none text-gray-700 focus:bg-white focus:px-2 focus:rounded transition text-sm"
                            placeholder="m2"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.harga ? formatCurrency(item.harga) : ""}
                            onChange={(e) => updateItemLocal(group.id, item.id, "harga", parseCurrency(e.target.value))}
                            onBlur={() => handleBlurItem(item, "harga")}
                            className="w-full text-right bg-transparent outline-none text-gray-700 focus:bg-white focus:px-2 focus:rounded transition text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-gray-700 font-medium">
                          {formatCurrency(item.qty * item.harga)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDeleteItem(group.id, item.id)}
                            className="text-red-300 hover:text-red-500 transition text-xs opacity-0 group-hover/row:opacity-100"
                            title="Hapus item"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Add item row */}
                    <tr key={`add-item-${group.id}`} className="border-t border-dashed border-gray-200">
                      <td />
                      <td />
                      <td colSpan={4} className="px-3 py-1.5">
                        <button
                          onClick={() => handleAddItem(group.id)}
                          disabled={saving}
                          className="text-xs text-gray-400 hover:text-gray-700 transition"
                        >
                          + Tambah item
                        </button>
                      </td>
                      {/* Subtotal */}
                      <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
                        {formatCurrency(groupSubtotal(group))}
                      </td>
                      <td />
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>

              {/* Grand Total */}
              {groups.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-800 uppercase tracking-wide text-right">
                      TOTAL
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                      Rp {formatCurrency(grandTotal)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Add Section Button */}
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={handleAddGroup}
              disabled={saving}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition disabled:opacity-50"
            >
              <span className="text-lg leading-none">+</span> Tambah Section
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
