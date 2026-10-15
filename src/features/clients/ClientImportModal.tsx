"use client";
import { useState, type ChangeEvent } from "react";
import { saveAs } from "file-saver";
import { Client } from "@/types/db";
import { addClients } from "@/services/clients";
import { useToast } from "@/components/Toast";
import { DialogA11y } from "@/components/DialogA11y";
import { BUDGET_RANGES, PROPERTY_TYPES, SOURCES } from "@/constants/options";
import { CLIENT_IMPORT_COLUMNS, buildClientImportRows, parseCSV, type ClientImportRow } from "@/utils/clientImport";

type Props = {
  existingClients: Client[];
  onImported: () => void;
  onClose: () => void;
};

async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.name.toLowerCase().endsWith(".csv")) return parseCSV(await file.text());
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(row.getCell(c).text ?? "");
    rows.push(cells);
  });
  return rows;
}

async function downloadTemplate() {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clients");
  ws.columns = CLIENT_IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.field, width: c.field === "notes" || c.field === "address" ? 32 : 20 }));
  ws.getRow(1).font = { bold: true };
  // Kolom Telepon bertipe teks supaya angka 0 di depan tidak hilang.
  ws.getColumn("phone").numFmt = "@";
  ws.addRow({ name: "Contoh: Budi Santoso", phone: "081234567890", address: "Jl. Melati No. 5", project_name: "Renovasi Dapur", property_type: "Rumah", budget_range: "< 500jt", source: "Instagram", notes: "Hapus baris contoh ini" });

  const lists: [string, readonly string[]][] = [["property_type", PROPERTY_TYPES], ["budget_range", BUDGET_RANGES], ["source", SOURCES]];
  for (const [key, values] of lists) {
    const letter = ws.getColumn(key).letter;
    for (let r = 2; r <= 1000; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${values.join(",")}"`],
      };
    }
  }
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "template_import_client.xlsx");
}

export function ClientImportModal({ existingClients, onImported, onClose }: Props) {
  const toast = useToast();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ClientImportRow[] | null>(null);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);

  const validRows = rows?.filter((r) => r.errors.length === 0) ?? [];
  const invalidCount = (rows?.length ?? 0) - validRows.length;

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setRows(null);
    setFileError("");
    setReading(true);
    try {
      const table = await readSpreadsheet(file);
      const { rows, missingColumns } = buildClientImportRows(table, existingClients);
      if (missingColumns.length) {
        setFileError(`Kolom ${missingColumns.join(" dan ")} tidak ditemukan di baris pertama. Pakai template atau samakan nama kolomnya.`);
      } else if (rows.length === 0) {
        setFileError("File tidak berisi data client. Isi minimal satu baris di bawah header.");
      } else {
        setRows(rows);
      }
    } catch {
      setFileError("File tidak bisa dibaca. Pastikan formatnya .xlsx atau .csv, lalu coba lagi.");
    } finally {
      setReading(false);
    }
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    setSaving(true);
    try {
      const count = await addClients(validRows.map((r) => r.data));
      toast(`${count} client berhasil di-import`, "success");
      onImported();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast(`Gagal import client: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <DialogA11y onClose={onClose} label="Import Client" />
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Import Client</h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-hover text-faint hover:text-muted transition"
            onClick={onClose}
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="text-sm text-muted space-y-1">
            <p>
              Upload file <span className="font-medium text-ink">.xlsx</span> atau <span className="font-medium text-ink">.csv</span> dengan kolom{" "}
              {CLIENT_IMPORT_COLUMNS.map((c) => c.header).join(", ")}. Kolom Nama dan Telepon wajib.
            </p>
            <p className="text-xs text-faint">
              Hasil Export CSV bisa langsung di-import. Status Lead dan Prioritas diabaikan karena otomatis mengikuti Lead.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="client-import-file" className="px-2.5 py-1.5 border border-line bg-white text-ink text-[13px] rounded-md hover:bg-hover transition-colors font-medium cursor-pointer focus-within:ring-2 focus-within:ring-accent/25">
              Pilih File
              <input id="client-import-file" type="file" accept=".xlsx,.csv" onChange={handleFile} className="sr-only" />
            </label>
            <button
              type="button"
              className="px-2.5 py-1.5 text-accent text-[13px] font-medium hover:underline"
              onClick={() => downloadTemplate().catch(() => toast("Gagal membuat template. Coba lagi.", "error"))}
            >
              Download Template
            </button>
            {fileName && <span className="text-[13px] text-muted truncate max-w-[240px]">{fileName}</span>}
          </div>

          {reading && <p className="text-sm text-muted">Membaca file...</p>}
          {fileError && <p className="text-sm text-danger" role="alert">{fileError}</p>}

          {rows && (
            <>
              <p className="text-sm text-ink">
                <span className="font-medium">{validRows.length}</span> baris siap di-import
                {invalidCount > 0 && (
                  <>, <span className="font-medium text-danger">{invalidCount} baris dilewati</span> karena error</>
                )}
                .
              </p>
              <div className="border border-line rounded-md overflow-x-auto max-h-[45vh]">
                <table className="w-full min-w-[720px] text-[13px]">
                  <thead className="bg-surface border-b border-line sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted w-12">Baris</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Nama</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Telepon</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Tipe</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Budget</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Sumber</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => {
                      const ok = r.errors.length === 0;
                      return (
                        <tr key={r.line} className={ok ? "" : "bg-danger-soft"}>
                          <td className="px-3 py-2 text-right text-muted">{r.line}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ok ? "tone-success" : "tone-danger"}`}>
                              {ok ? "Siap" : "Dilewati"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-ink max-w-[160px] truncate">{r.data.name || "—"}</td>
                          <td className="px-3 py-2 text-muted whitespace-nowrap">{r.data.phone || "—"}</td>
                          <td className="px-3 py-2 text-muted whitespace-nowrap">{r.data.property_type || "—"}</td>
                          <td className="px-3 py-2 text-muted whitespace-nowrap">{r.data.budget_range || "—"}</td>
                          <td className="px-3 py-2 text-muted whitespace-nowrap">{r.data.source || "—"}</td>
                          <td className="px-3 py-2 text-xs">
                            {[...r.errors.map((m) => ({ m, cls: "text-danger" })), ...r.warnings.map((m) => ({ m, cls: "text-warning" }))].map(({ m, cls }) => (
                              <div key={m} className={cls}>{m}</div>
                            ))}
                            {ok && r.warnings.length === 0 && <span className="text-faint">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-line">
          <button
            type="button"
            disabled={saving || validRows.length === 0}
            onClick={handleImport}
            className="px-6 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Mengimport..." : validRows.length ? `Import ${validRows.length} Client` : "Import"}
          </button>
          <button type="button" className="px-6 py-2 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition" onClick={onClose}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
