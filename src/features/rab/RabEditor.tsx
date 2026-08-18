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
import { Rab, RabGroup, RabItem, SkemaPembayaran } from "@/types/db";
import RabPrintView from "@/features/rab/RabPrintView";
import SphPrintView, { SphConfig } from "@/features/rab/SphPrintView";
import { generateSphDocx } from "@/features/rab/generateSph";
import { generateRabExcel } from "@/features/rab/generateRabExcel";
import { supabase } from "@/services/supabase";
import {
  groupSubtotal as calcGroupSubtotal,
  grandTotal as calcGrandTotal,
  netTotal as calcNetTotal,
  diskonNilaiFromPersen,
  diskonPersenFromNilai,
} from "@/utils/rabCalculations";

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
  const [diskon, setDiskon] = useState({ persen: "", nilai: "" });
  const [skema, setSkema] = useState<Array<{ persen: string; keterangan: string }>>([]);
  const [showPrint, setShowPrint] = useState(false);
  const [showSph, setShowSph] = useState(false);
  const [showSphDialog, setShowSphDialog] = useState(false);
  const [sphMode, setSphMode] = useState<"print" | "word">("print");
  const [rabName, setRabName] = useState("");
  const [sphConfig, setSphConfig] = useState<SphConfig>({
    nomorSph: "",
    kota: "Bogor",
    tanggal: "",
    greeting: "Bapak",
    clientName: "",
    penandatangan: "M. Tourqi",
  });
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [draggedGroupId, setDraggedGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ groupId: string; itemId: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ groupId: string; itemId: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rabData, rawGroups] = await Promise.all([
        getRabByLead(leadId).then((list) => list.find((r) => r.id === rabId) ?? null),
        getRabWithGroups(rabId),
      ]);
      setRab(rabData);
      setRabName(rabData?.nama ?? "");
      setDiskon({
        persen: rabData?.diskon_persen ? String(rabData.diskon_persen) : "",
        nilai: rabData?.diskon_nilai ? String(rabData.diskon_nilai) : "",
      });
      setSkema(
        (rabData?.skema_pembayaran ?? []).map((s) => ({
          persen: String(s.persen),
          keterangan: s.keterangan,
        }))
      );
      setGroups(
        rawGroups.map((g) => ({
          id: g.id,
          rab_id: g.rab_id,
          no: g.no,
          deskripsi: g.deskripsi,
          items: (g.items ?? []).map((item) => ({ ...item })),
        }))
      );

      // Load client name for SPH
      const { data: leadData } = await supabase
        .from("leads")
        .select("client_id")
        .eq("id", leadId)
        .single();
      if (leadData?.client_id) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("name")
          .eq("id", leadData.client_id)
          .single();
        if (clientData?.name) {
          setSphConfig((prev) => ({ ...prev, clientName: clientData.name }));
        }
      }
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
  const groupSubtotal = (group: LocalGroup) => calcGroupSubtotal(group);

  const grandTotal = calcGrandTotal(groups);
  const diskonNilaiNum = parseFloat(diskon.nilai) || 0;
  const netTotal = calcNetTotal(groups, diskonNilaiNum);

  function handleDiskonPersenChange(value: string) {
    const persen = parseFloat(value) || 0;
    const nilai = diskonNilaiFromPersen(grandTotal, persen);
    setDiskon({ persen: value, nilai: nilai > 0 ? String(nilai) : "" });
  }

  function handleDiskonNilaiChange(value: string) {
    const nilai = parseFloat(value) || 0;
    const persen = grandTotal > 0 ? diskonPersenFromNilai(grandTotal, nilai).toFixed(2) : "";
    setDiskon({ nilai: value, persen: persen });
  }

  async function handleSaveDiskon() {
    if (!rab) return;
    const diskon_persen = parseFloat(diskon.persen) || 0;
    const diskon_nilai = parseFloat(diskon.nilai) || 0;
    try {
      await updateRab(rab.id, { diskon_persen, diskon_nilai });
      setRab({ ...rab, diskon_persen, diskon_nilai });
    } catch {
      toast("Gagal menyimpan diskon", "error");
    }
  }

  async function handleSaveSkema(updatedSkema?: typeof skema) {
    if (!rab) return;
    const toSave = updatedSkema ?? skema;
    const parsed = toSave.map((s) => ({
      persen: parseFloat(s.persen) || 0,
      keterangan: s.keterangan,
    })) as SkemaPembayaran[];
    try {
      await updateRab(rab.id, { skema_pembayaran: parsed });
      setRab({ ...rab, skema_pembayaran: parsed });
    } catch {
      toast("Gagal menyimpan skema pembayaran", "error");
    }
  }

  function handleAddSkema() {
    const next = [...skema, { persen: "", keterangan: "" }];
    setSkema(next);
    handleSaveSkema(next);
  }

  function handleRemoveSkema(idx: number) {
    const next = skema.filter((_, i) => i !== idx);
    setSkema(next);
    handleSaveSkema(next);
  }

  function updateSkemaLocal(idx: number, field: "persen" | "keterangan", value: string) {
    setSkema((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

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

  // --- REORDER (drag & drop) ---
  async function persistGroupOrder(orderedGroups: LocalGroup[]) {
    try {
      await Promise.all(orderedGroups.map((g) => updateRabGroup(g.id, { no: g.no })));
    } catch {
      toast("Gagal menyimpan urutan section", "error");
    }
  }

  function handleGroupDragStart(e: React.DragEvent, groupId: string) {
    setDraggedGroupId(groupId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleGroupDragOver(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    if (draggedGroupId && draggedGroupId !== groupId) setDragOverGroupId(groupId);
  }

  function handleGroupDrop(e: React.DragEvent, targetGroupId: string) {
    e.preventDefault();
    setDragOverGroupId(null);
    const sourceId = draggedGroupId;
    setDraggedGroupId(null);
    if (!sourceId || sourceId === targetGroupId) return;
    setGroups((prev) => {
      const fromIdx = prev.findIndex((g) => g.id === sourceId);
      const toIdx = prev.findIndex((g) => g.id === targetGroupId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const renumbered = next.map((g, i) => ({ ...g, no: i + 1 }));
      persistGroupOrder(renumbered);
      return renumbered;
    });
  }

  function handleGroupDragEnd() {
    setDraggedGroupId(null);
    setDragOverGroupId(null);
  }

  async function persistItemOrder(orderedItems: LocalItem[]) {
    try {
      await Promise.all(orderedItems.map((it) => updateRabItem(it.id, { sort_order: it.sort_order })));
    } catch {
      toast("Gagal menyimpan urutan item", "error");
    }
  }

  function handleItemDragStart(e: React.DragEvent, groupId: string, itemId: string) {
    setDraggedItem({ groupId, itemId });
    e.dataTransfer.effectAllowed = "move";
  }

  function handleItemDragOver(e: React.DragEvent, groupId: string, itemId: string) {
    e.preventDefault();
    if (draggedItem && draggedItem.groupId === groupId && draggedItem.itemId !== itemId) {
      setDragOverItem({ groupId, itemId });
    }
  }

  function handleItemDrop(e: React.DragEvent, groupId: string, targetItemId: string) {
    e.preventDefault();
    setDragOverItem(null);
    const source = draggedItem;
    setDraggedItem(null);
    if (!source || source.groupId !== groupId || source.itemId === targetItemId) return;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const fromIdx = g.items.findIndex((i) => i.id === source.itemId);
        const toIdx = g.items.findIndex((i) => i.id === targetItemId);
        if (fromIdx === -1 || toIdx === -1) return g;
        const nextItems = [...g.items];
        const [moved] = nextItems.splice(fromIdx, 1);
        nextItems.splice(toIdx, 0, moved);
        const renumbered = nextItems.map((it, i) => ({ ...it, sort_order: i }));
        persistItemOrder(renumbered);
        return { ...g, items: renumbered };
      })
    );
  }

  function handleItemDragEnd() {
    setDraggedItem(null);
    setDragOverItem(null);
  }

  // --- EXPORT EXCEL ---
  async function handleExportExcel() {
    if (!rab) return;
    try {
      await generateRabExcel(rab, groups);
    } catch {
      toast("Gagal membuat file Excel", "error");
    }
  }

  // --- PRINT ---
  function handlePrint() {
    setShowSph(false);
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
  }

  function openSphDialog(mode: "print" | "word") {
    setSphMode(mode);
    const now = new Date();
    const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
    const ID_MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    setSphConfig((prev) => ({
      ...prev,
      nomorSph: prev.nomorSph || `001/SPH/${ROMAN[now.getMonth()]}/${now.getFullYear()}`,
      tanggal: prev.tanggal || `${String(now.getDate()).padStart(2, "0")} ${ID_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    }));
    setShowSphDialog(true);
  }

  async function handleConfirmSph() {
    setShowSphDialog(false);
    if (sphMode === "word") {
      await generateSphDocx(rab!, groups, sphConfig);
    } else {
      setShowPrint(false);
      setShowSph(true);
      setTimeout(() => window.print(), 300);
    }
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
      <div className="p-6">
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
      {showSph && (
        <SphPrintView
          rab={rab}
          groups={groups}
          config={sphConfig}
          onClose={() => setShowSph(false)}
        />
      )}

      <div className="p-6 space-y-6 print:hidden">
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
                <p className="text-xl font-bold text-gray-900">Rp {formatCurrency(netTotal)}</p>
                {diskonNilaiNum > 0 && (
                  <p className="text-xs text-gray-400 line-through">Rp {formatCurrency(grandTotal)}</p>
                )}
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition font-medium"
              >
                ⎙ Print RAB
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800 transition font-medium"
              >
                ↓ Excel RAB
              </button>
              <button
                onClick={() => openSphDialog("print")}
                className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition font-medium"
              >
                ⎙ Print SPH
              </button>
              <button
                onClick={() => openSphDialog("word")}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium"
              >
                ↓ Word SPH
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                      Belum ada section. Klik "+ Tambah Section" untuk mulai.
                    </td>
                  </tr>
                )}
                {groups.map((group) => (
                  <React.Fragment key={group.id}>
                    {/* Group Header Row */}
                    <tr
                      key={`group-${group.id}`}
                      className={`bg-gray-50 border-t border-gray-200 transition ${draggedGroupId === group.id ? "opacity-40" : ""} ${dragOverGroupId === group.id ? "border-t-2 border-t-blue-400" : ""}`}
                      onDragOver={(e) => handleGroupDragOver(e, group.id)}
                      onDrop={(e) => handleGroupDrop(e, group.id)}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-700 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span
                            draggable
                            onDragStart={(e) => handleGroupDragStart(e, group.id)}
                            onDragEnd={handleGroupDragEnd}
                            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none"
                            title="Geser untuk urutkan section"
                          >
                            ⠿
                          </span>
                          {group.no}
                        </div>
                      </td>
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
                      <tr
                        key={item.id}
                        className={`border-t border-gray-100 hover:bg-gray-50 transition-colors group/row ${draggedItem?.itemId === item.id ? "opacity-40" : ""} ${dragOverItem?.itemId === item.id ? "border-t-2 border-t-blue-400" : ""}`}
                        onDragOver={(e) => handleItemDragOver(e, group.id, item.id)}
                        onDrop={(e) => handleItemDrop(e, group.id, item.id)}
                      >
                        <td className="px-3 py-2 text-center">
                          <span
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, group.id, item.id)}
                            onDragEnd={handleItemDragEnd}
                            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 select-none inline-block opacity-0 group-hover/row:opacity-100 transition"
                            title="Geser untuk urutkan item"
                          >
                            ⠿
                          </span>
                        </td>
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

                {/* Tambah Section — above subtotal */}
                <tr className="border-t border-dashed border-gray-200">
                  <td colSpan={8} className="px-4 py-3">
                    <button
                      onClick={handleAddGroup}
                      disabled={saving}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition disabled:opacity-50"
                    >
                      <span className="text-lg leading-none">+</span> Tambah Section
                    </button>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                {groups.length > 0 && (
                  <>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={6} className="px-4 py-2.5 text-sm font-semibold text-gray-700 text-right">
                        Subtotal
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-semibold text-gray-700">
                        Rp {formatCurrency(grandTotal)}
                      </td>
                      <td />
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td colSpan={5} className="px-4 py-2 text-sm text-gray-600 text-right">
                        Diskon
                      </td>
                      <td className="px-2 py-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={diskon.persen}
                            onChange={(e) => handleDiskonPersenChange(e.target.value)}
                            onBlur={handleSaveDiskon}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full text-right bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-gray-400 pr-6"
                          />
                          <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={diskon.nilai}
                          onChange={(e) => handleDiskonNilaiChange(e.target.value)}
                          onBlur={handleSaveDiskon}
                          placeholder="0"
                          min="0"
                          className="w-full text-right bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </td>
                      <td />
                    </tr>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-800 uppercase tracking-wide text-right">
                        TOTAL
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                        Rp {formatCurrency(netTotal)}
                      </td>
                      <td />
                    </tr>

                    {/* Skema Pembayaran header */}
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left bg-gray-50">
                        Skema Pembayaran
                      </td>
                      <td className="px-3 py-2 text-right bg-gray-50">
                        <button
                          onClick={handleAddSkema}
                          className="text-xs text-blue-500 hover:text-blue-700 font-medium transition"
                          title="Tambah tahap pembayaran"
                        >
                          + Tambah Tahap
                        </button>
                      </td>
                      <td className="bg-gray-50" />
                    </tr>

                    {skema.length === 0 && (
                      <tr className="border-t border-dashed border-gray-200">
                        <td colSpan={8} className="px-4 py-2 text-xs text-gray-400 italic">
                          Belum ada skema pembayaran. Klik "+ Tambah Tahap" untuk menambahkan.
                        </td>
                      </tr>
                    )}

                    {skema.map((s, idx) => {
                      const amount = Math.round(netTotal * (parseFloat(s.persen) || 0) / 100);
                      return (
                        <tr key={idx} className="border-t border-gray-100 group/skema">
                          <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                            Tahap {idx + 1}
                          </td>
                          <td colSpan={4} className="px-3 py-2">
                            <input
                              type="text"
                              value={s.keterangan}
                              onChange={(e) => updateSkemaLocal(idx, "keterangan", e.target.value)}
                              onBlur={() => handleSaveSkema()}
                              placeholder="Keterangan tahap pembayaran..."
                              className="w-full bg-transparent outline-none text-sm text-gray-700 focus:bg-white focus:px-2 focus:rounded transition"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <div className="relative">
                              <input
                                type="number"
                                value={s.persen}
                                onChange={(e) => updateSkemaLocal(idx, "persen", e.target.value)}
                                onBlur={() => handleSaveSkema()}
                                placeholder="0"
                                min="0"
                                max="100"
                                step="0.01"
                                className="w-full text-right bg-white border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-gray-400 pr-6"
                              />
                              <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                            {amount > 0 ? `Rp ${formatCurrency(amount)}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => handleRemoveSkema(idx)}
                              className="text-red-300 hover:text-red-500 transition text-xs opacity-0 group-hover/skema:opacity-100"
                              title="Hapus tahap"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {skema.length > 0 && (
                      <tr className="border-t border-dashed border-gray-200">
                        <td colSpan={5} className="px-4 py-1.5 text-xs text-right text-gray-400">
                          Total skema
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`text-xs font-medium ${Math.abs(skema.reduce((s, item) => s + (parseFloat(item.persen) || 0), 0) - 100) < 0.01 ? "text-green-600" : "text-amber-600"}`}>
                            {skema.reduce((s, item) => s + (parseFloat(item.persen) || 0), 0).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-500">
                          {formatCurrency(skema.reduce((s, item) => s + Math.round(netTotal * (parseFloat(item.persen) || 0) / 100), 0))}
                        </td>
                        <td />
                      </tr>
                    )}
                  </>
                )}

              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* SPH Config Dialog */}
      {showSphDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Konfigurasi SPH</h2>
            <div className="space-y-3">
              {[
                { label: "Nomor SPH", key: "nomorSph", placeholder: "001/SPH/XII/2025" },
                { label: "Kota", key: "kota", placeholder: "Bogor" },
                { label: "Tanggal", key: "tanggal", placeholder: "03 Desember 2025" },
                { label: "Nama Klien", key: "clientName", placeholder: "Nama lengkap klien" },
                { label: "Penandatangan", key: "penandatangan", placeholder: "M. Tourqi" },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={sphConfig[key as keyof SphConfig]}
                    onChange={(e) => setSphConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sapaan</label>
                <select
                  value={sphConfig.greeting}
                  onChange={(e) => setSphConfig((prev) => ({ ...prev, greeting: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
                >
                  <option value="Bapak">Bapak</option>
                  <option value="Ibu">Ibu</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSphDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSph}
                className={`flex-1 px-4 py-2 text-white text-sm rounded-lg transition font-medium ${
                  sphMode === "word"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {sphMode === "word" ? "↓ Download Word" : "⎙ Print SPH"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
