import { Client } from "@/types/db";
import { BUDGET_RANGES, PROPERTY_TYPES, SOURCES } from "@/constants/options";

export type ClientImportField = "name" | "phone" | "address" | "project_name" | "property_type" | "budget_range" | "source" | "notes";

export type ClientImportData = Pick<Client, "name"> & Partial<Pick<Client, Exclude<ClientImportField, "name">>>;

export type ClientImportRow = {
  /** Nomor baris di file (header = baris 1), buat ditunjukkan ke user. */
  line: number;
  data: ClientImportData;
  errors: string[];
  warnings: string[];
};

// Header template = header Export CSV di ClientsTable, supaya hasil export bisa
// di-import balik. Kolom export lain (Status Lead, Prioritas, Dibuat) sengaja
// diabaikan karena derived dari Lead / diisi DB.
export const CLIENT_IMPORT_COLUMNS: { field: ClientImportField; header: string; aliases: string[] }[] = [
  { field: "name", header: "Nama", aliases: ["nama client", "nama klien", "name"] },
  { field: "phone", header: "Telepon", aliases: ["no. hp", "no hp", "nomor hp", "hp", "whatsapp", "wa", "phone"] },
  { field: "address", header: "Alamat", aliases: ["address"] },
  { field: "project_name", header: "Nama Project", aliases: ["nama proyek", "project", "proyek"] },
  { field: "property_type", header: "Tipe Properti", aliases: ["tipe", "property type"] },
  { field: "budget_range", header: "Budget", aliases: ["budget range"] },
  { field: "source", header: "Sumber", aliases: ["source"] },
  { field: "notes", header: "Catatan", aliases: ["notes", "keterangan"] },
];

const ENUMS: Partial<Record<ClientImportField, { label: string; values: readonly string[] }>> = {
  property_type: { label: "Tipe Properti", values: PROPERTY_TYPES },
  budget_range: { label: "Budget", values: BUDGET_RANGES },
  source: { label: "Sumber", values: SOURCES },
};

const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Parse CSV (koma atau titik koma — Excel lokal Indonesia export pakai `;`). */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * Samakan format No. HP dengan form (digit saja, awalan 0). Menangani +62/62
 * dan angka 0 depan yang hilang karena kolom Excel bertipe angka.
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = "0" + digits.slice(2);
  else if (digits.startsWith("8")) digits = "0" + digits;
  return digits;
}

/**
 * Ubah baris mentah (baris pertama = header) jadi baris client tervalidasi.
 * `existingClients` dipakai buat cek No. HP duplikat, sama seperti ClientFormModal.
 */
export function buildClientImportRows(table: string[][], existingClients: Pick<Client, "name" | "phone">[]): {
  rows: ClientImportRow[];
  missingColumns: string[];
} {
  const [header = [], ...body] = table;
  const colIndex = new Map<ClientImportField, number>();
  header.forEach((h, i) => {
    const key = normalizeKey(h);
    const col = CLIENT_IMPORT_COLUMNS.find((c) => normalizeKey(c.header) === key || c.aliases.includes(key));
    if (col && !colIndex.has(col.field)) colIndex.set(col.field, i);
  });

  const missingColumns = CLIENT_IMPORT_COLUMNS
    .filter((c) => (c.field === "name" || c.field === "phone") && !colIndex.has(c.field))
    .map((c) => c.header);
  if (missingColumns.length) return { rows: [], missingColumns };

  const existingByPhone = new Map<string, string>();
  for (const c of existingClients) {
    const p = (c.phone || "").replace(/\D/g, "");
    if (p) existingByPhone.set(p, c.name);
  }
  const seenInFile = new Map<string, number>();

  const rows: ClientImportRow[] = [];
  body.forEach((cells, idx) => {
    const line = idx + 2;
    const get = (f: ClientImportField) => {
      const i = colIndex.get(f);
      return i === undefined ? "" : (cells[i] ?? "").trim();
    };
    if (CLIENT_IMPORT_COLUMNS.every((c) => !get(c.field))) return; // baris kosong

    const errors: string[] = [];
    const warnings: string[] = [];
    const data: ClientImportData = { name: get("name") };

    if (!data.name) errors.push("Nama wajib diisi");

    const phone = normalizePhone(get("phone"));
    if (!phone) errors.push("No. HP wajib diisi");
    else if (phone.length < 9 || phone.length > 13) errors.push(`No. HP "${get("phone")}" harus 9–13 digit`);
    else if (existingByPhone.has(phone)) errors.push(`No. HP sudah dipakai client "${existingByPhone.get(phone)}"`);
    else if (seenInFile.has(phone)) errors.push(`No. HP sama dengan baris ${seenInFile.get(phone)}`);
    if (phone) {
      data.phone = phone;
      if (!seenInFile.has(phone)) seenInFile.set(phone, line);
    }

    for (const f of ["address", "project_name", "notes"] as const) {
      const v = get(f);
      if (v) data[f] = v;
    }

    for (const [f, spec] of Object.entries(ENUMS) as [ClientImportField, { label: string; values: readonly string[] }][]) {
      const v = get(f);
      if (!v) continue;
      const match = spec.values.find((opt) => normalizeKey(opt) === normalizeKey(v));
      if (match) (data as Record<string, string>)[f] = match;
      else warnings.push(`${spec.label} "${v}" tidak dikenal, dikosongkan`);
    }

    rows.push({ line, data, errors, warnings });
  });

  return { rows, missingColumns: [] };
}
