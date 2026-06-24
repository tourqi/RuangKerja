"use client";
import { useState, type FormEvent } from "react";
import { Project, Client, Lead, Rab, Invoice } from "@/types/db";
import { addInvoice, generateInvoiceNumber, getInvoicesByProject } from "@/services/invoices";
import { getRabByLead, getRabWithGroups } from "@/services/rab";
import { useToast } from "@/components/Toast";
import { formatRupiah } from "@/utils/format";

type Termin = {
  id: string;
  nama: string;
  persen: string;
  jumlah: string;
  due_date: string;
};

function newTermin(idx: number): Termin {
  const d = new Date(); d.setDate(d.getDate() + 14 * (idx + 1));
  return { id: crypto.randomUUID(), nama: "", persen: "", jumlah: "", due_date: d.toISOString().slice(0, 10) };
}

type Props = {
  projects: Project[];
  clients: Client[];
  leads: Lead[];
  unpaidProjects: Project[];
  userId?: string;
  onSaved: () => void;
  onClose: () => void;
};

export function InvoiceFormModal({
  projects,
  clients,
  leads,
  unpaidProjects,
  userId,
  onSaved,
  onClose,
}: Props) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({ project_id: "", invoice_date: today, notes: "" });
  const [availableRabs, setAvailableRabs] = useState<Rab[]>([]);
  const [selectedRabId, setSelectedRabId] = useState("");
  const [rabTotal, setRabTotal] = useState<number | null>(null);
  const [loadingRabs, setLoadingRabs] = useState(false);
  const [termins, setTermins] = useState<Termin[]>([newTermin(0)]);
  const [diskon, setDiskon] = useState({ persen: "", nilai: "" });
  const [existingInvoices, setExistingInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);

  const diskonNilaiNum = parseFloat(diskon.nilai) || 0;
  const effectiveRabTotal = rabTotal != null ? rabTotal - diskonNilaiNum : null;
  const totalTermin = termins.reduce((s, t) => s + (parseFloat(t.jumlah) || 0), 0);
  const sisaTagihan = effectiveRabTotal != null ? effectiveRabTotal - totalTermin : null;

  async function handleProjectChange(projectId: string) {
    setForm((f) => ({ ...f, project_id: projectId }));
    setSelectedRabId("");
    setRabTotal(null);
    setAvailableRabs([]);
    setExistingInvoices([]);
    setDiskon({ persen: "", nilai: "" });
    if (!projectId) return;

    const project = projects.find((p) => p.id === projectId);
    if (!project?.client_id) return;

    setLoadingRabs(true);
    try {
      const [allRabsRaw, invoices] = await Promise.all([
        (async () => {
          const allRabs: Rab[] = [];
          if (project.lead_id) {
            const rabs = await getRabByLead(project.lead_id);
            allRabs.push(...rabs.filter((r) => r.status === "approved"));
          } else {
            const dealLeads = leads.filter((l) => l.client_id === project.client_id && l.status === "Deal");
            for (const lead of dealLeads) {
              const rabs = await getRabByLead(lead.id);
              allRabs.push(...rabs.filter((r) => r.status === "approved"));
            }
          }
          return allRabs;
        })(),
        getInvoicesByProject(projectId),
      ]);
      setAvailableRabs(allRabsRaw);
      setExistingInvoices(invoices);
    } catch {
      toast("Gagal memuat data", "error");
    } finally {
      setLoadingRabs(false);
    }
  }

  async function handleRabChange(rabId: string) {
    setSelectedRabId(rabId);
    setRabTotal(null);
    setDiskon({ persen: "", nilai: "" });
    if (!rabId) return;
    try {
      const groups = await getRabWithGroups(rabId);
      const grossTotal = groups.reduce((sum, g) => sum + (g.items ?? []).reduce((s, item) => s + item.qty * item.harga, 0), 0);
      setRabTotal(grossTotal);

      const selectedRab = availableRabs.find((r) => r.id === rabId);
      const diskonNilai = selectedRab?.diskon_nilai ?? 0;
      if (diskonNilai > 0) {
        setDiskon({
          persen: selectedRab?.diskon_persen ? String(selectedRab.diskon_persen) : "",
          nilai: String(diskonNilai),
        });
      }

      // Suggest next termin from skema_pembayaran
      const skema = selectedRab?.skema_pembayaran ?? [];
      const rabInvoiceCount = existingInvoices.filter((inv) => inv.rab_id === rabId).length;
      const netTotal = grossTotal - diskonNilai;

      if (skema.length > 0 && rabInvoiceCount < skema.length) {
        const suggested = skema[rabInvoiceCount];
        const suggestedAmount = Math.round(netTotal * suggested.persen / 100);
        const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 14);
        setTermins([{
          id: crypto.randomUUID(),
          nama: suggested.keterangan || `Termin ${rabInvoiceCount + 1}`,
          persen: String(suggested.persen),
          jumlah: String(suggestedAmount),
          due_date: dueDate.toISOString().slice(0, 10),
        }]);
      } else {
        setTermins((prev) => prev.map((t) => ({ ...t, jumlah: "", persen: "" })));
      }
    } catch {
      toast("Gagal memuat total RAB", "error");
    }
  }

  function updateTermin(id: string, field: keyof Termin, value: string) {
    setTermins((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      const base = effectiveRabTotal ?? rabTotal;
      if (base && base > 0) {
        if (field === "persen" && value !== "") {
          updated.jumlah = Math.round((parseFloat(value) / 100) * base).toString();
        } else if (field === "jumlah" && value !== "") {
          updated.persen = ((parseFloat(value) / base) * 100).toFixed(1);
        }
      }
      return updated;
    }));
  }

  function handleDiskonPersenChange(value: string) {
    const persen = parseFloat(value) || 0;
    const nilai = rabTotal && rabTotal > 0 ? Math.round(rabTotal * persen / 100) : 0;
    setDiskon({ persen: value, nilai: nilai > 0 ? String(nilai) : "" });
  }

  function handleDiskonNilaiChange(value: string) {
    const nilai = parseFloat(value) || 0;
    const persen = rabTotal && rabTotal > 0 ? ((nilai / rabTotal) * 100).toFixed(1) : "";
    setDiskon({ nilai: value, persen: persen });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.project_id) { toast("Pilih project terlebih dahulu", "warning"); return; }
    const validTermins = termins.filter((t) => t.nama && parseFloat(t.jumlah) > 0);
    if (validTermins.length === 0) { toast("Tambahkan minimal 1 termin dengan nama dan jumlah", "warning"); return; }

    setSaving(true);
    try {
      const project = projects.find((p) => p.id === form.project_id);
      for (const termin of validTermins) {
        const invoice_number = await generateInvoiceNumber();
        await addInvoice({
          invoice_number,
          client_id: project?.client_id || undefined,
          project_id: form.project_id,
          rab_id: selectedRabId || undefined,
          total_amount: parseFloat(termin.jumlah),
          status: "draft",
          invoice_date: form.invoice_date || undefined,
          due_date: termin.due_date || undefined,
          notes: [termin.nama, form.notes].filter(Boolean).join(" · ") || undefined,
          created_by: userId,
          diskon_persen: parseFloat(diskon.persen) || undefined,
          diskon_nilai: parseFloat(diskon.nilai) || undefined,
        });
      }
      toast(`${validTermins.length} invoice berhasil dibuat`, "success");
      onSaved();
    } catch (err: unknown) {
      toast(`Gagal membuat invoice: ${(err as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Buat Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Project */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Project *</label>
            <select
              value={form.project_id}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
              required
            >
              <option value="">Pilih project…</option>
              {unpaidProjects.map((p) => {
                const client = clients.find((c) => c.id === p.client_id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}{client ? ` — ${client.name}` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* RAB */}
          {form.project_id && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                RAB (opsional)
                {loadingRabs && <span className="ml-2 text-gray-400">Memuat…</span>}
              </label>
              {availableRabs.length === 0 && !loadingRabs ? (
                <p className="text-xs text-gray-400 py-2">Tidak ada RAB disetujui untuk project ini.</p>
              ) : (
                <select
                  value={selectedRabId}
                  onChange={(e) => handleRabChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">— Tanpa RAB —</option>
                  {availableRabs.map((r) => (
                    <option key={r.id} value={r.id}>{r.nama}</option>
                  ))}
                </select>
              )}
              {rabTotal != null && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">Total RAB</span>
                    <span className="text-sm font-semibold text-gray-900">{formatRupiah(rabTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs text-gray-500 shrink-0">Diskon</span>
                    <div className="relative w-24">
                      <input
                        type="number" value={diskon.persen} onChange={(e) => handleDiskonPersenChange(e.target.value)}
                        placeholder="0" min="0" max="100" step="any"
                        className="w-full pl-2.5 pr-7 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                    </div>
                    <input
                      type="number" value={diskon.nilai} onChange={(e) => handleDiskonNilaiChange(e.target.value)}
                      placeholder="Rp" min="0"
                      className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                    />
                  </div>
                  {diskonNilaiNum > 0 && (
                    <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-700">Total setelah diskon</span>
                      <span className="text-sm font-semibold text-blue-900">{formatRupiah(effectiveRabTotal ?? 0)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Riwayat Invoice Sebelumnya */}
          {form.project_id && existingInvoices.length > 0 && (() => {
            const filtered = selectedRabId
              ? existingInvoices.filter((inv) => inv.rab_id === selectedRabId)
              : existingInvoices;
            if (filtered.length === 0) return null;
            const totalTagih = filtered.reduce((s, inv) => s + inv.total_amount, 0);
            const statusLabel: Record<string, string> = {
              draft: "Draft", sent: "Terkirim", partial: "Sebagian", paid: "Lunas", overdue: "Lewat Jatuh Tempo",
            };
            const statusColor: Record<string, string> = {
              draft: "text-gray-500", sent: "text-blue-600", partial: "text-amber-600",
              paid: "text-green-600", overdue: "text-red-500",
            };
            return (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Invoice Sebelumnya ({filtered.length})
                  </span>
                  <span className="text-xs text-gray-500">Total: {formatRupiah(totalTagih)}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {filtered.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-700">{inv.invoice_number}</span>
                        {inv.notes && (
                          <span className="text-xs text-gray-400 truncate max-w-[140px]">{inv.notes.split(" · ")[0]}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${statusColor[inv.status] ?? "text-gray-500"}`}>
                          {statusLabel[inv.status] ?? inv.status}
                        </span>
                        <span className="text-xs font-semibold text-gray-800">{formatRupiah(inv.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Tanggal Invoice */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Tanggal Invoice *</label>
            <input
              type="date" value={form.invoice_date}
              onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>

          {/* Termin Builder */}
          {form.project_id && (
            <div>
              {/* Suggestion badge from skema_pembayaran */}
              {(() => {
                if (!selectedRabId) return null;
                const selectedRab = availableRabs.find((r) => r.id === selectedRabId);
                const skema = selectedRab?.skema_pembayaran ?? [];
                if (skema.length === 0) return null;
                const rabInvoiceCount = existingInvoices.filter((inv) => inv.rab_id === selectedRabId).length;
                const nextIdx = rabInvoiceCount;
                return (
                  <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold text-amber-800">
                      💡 Skema RAB ({skema.length} termin):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {skema.map((s, i) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                            i < rabInvoiceCount
                              ? "bg-green-100 border-green-300 text-green-700 line-through opacity-60"
                              : i === nextIdx
                              ? "bg-amber-200 border-amber-400 text-amber-900 font-semibold"
                              : "bg-white border-gray-200 text-gray-500"
                          }`}
                        >
                          {i < rabInvoiceCount && "✓ "}
                          {i === nextIdx && "→ "}
                          Ke-{i + 1} · {s.persen}%
                        </span>
                      ))}
                    </div>
                    {nextIdx < skema.length && (
                      <span className="text-xs text-amber-700 w-full mt-0.5">
                        Saran: tagihan ke-{nextIdx + 1} · {skema[nextIdx].keterangan || `${skema[nextIdx].persen}%`}
                      </span>
                    )}
                    {nextIdx >= skema.length && (
                      <span className="text-xs text-green-700 font-medium">Semua termin sudah diinvoice ✓</span>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-700">Termin Pembayaran *</label>
                {rabTotal != null && sisaTagihan != null && (
                  <span className={`text-xs font-medium ${Math.abs(sisaTagihan) < 1 ? "text-green-600" : sisaTagihan < 0 ? "text-red-500" : "text-orange-500"}`}>
                    Sisa: {formatRupiah(sisaTagihan)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {termins.map((t, idx) => (
                  <div key={t.id} className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="col-span-2 md:col-span-1">
                        <input
                          type="text" value={t.nama}
                          onChange={(e) => updateTermin(t.id, "nama", e.target.value)}
                          placeholder={idx === 0 ? "DP" : idx === termins.length - 1 ? "Pelunasan" : `Termin ${idx + 1}`}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </div>
                      <div>
                        <div className="relative">
                          <input
                            type="number" value={t.persen}
                            onChange={(e) => updateTermin(t.id, "persen", e.target.value)}
                            placeholder="0" min="0" max="100" step="any"
                            className="w-full pl-2.5 pr-7 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                          />
                          <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                        </div>
                      </div>
                      <div>
                        <input
                          type="number" value={t.jumlah}
                          onChange={(e) => updateTermin(t.id, "jumlah", e.target.value)}
                          placeholder="Rp" min="0"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </div>
                      <div>
                        <input
                          type="date" value={t.due_date}
                          onChange={(e) => updateTermin(t.id, "due_date", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-xs text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTermins((prev) => prev.filter((x) => x.id !== t.id))}
                      disabled={termins.length === 1}
                      className="mt-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTermins((prev) => [...prev, newTermin(prev.length)])}
                className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Tambah Termin
              </button>
              <div className="mt-2 text-xs text-gray-400">
                <span className="font-medium text-gray-600">Kolom: </span> Nama · % · Jumlah (Rp) · Jatuh Tempo
              </div>
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Catatan</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Catatan tambahan…"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {saving ? "Menyimpan…" : `Buat ${termins.filter((t) => t.nama && parseFloat(t.jumlah) > 0).length || ""} Invoice`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
