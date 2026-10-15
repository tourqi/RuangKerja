import { describe, expect, it } from "vitest";
import { buildClientImportRows, normalizePhone, parseCSV } from "./clientImport";

describe("parseCSV", () => {
  it("handles quotes, BOM and CRLF", () => {
    expect(parseCSV('﻿Nama,Catatan\r\n"Budi, S.T.","bilang ""ok"""\r\n')).toEqual([
      ["Nama", "Catatan"],
      ["Budi, S.T.", 'bilang "ok"'],
    ]);
  });

  it("detects semicolon delimiter", () => {
    expect(parseCSV("Nama;Telepon\nBudi;0812")).toEqual([["Nama", "Telepon"], ["Budi", "0812"]]);
  });
});

describe("normalizePhone", () => {
  it("normalizes +62, 62 and lost leading zero", () => {
    expect(normalizePhone("+62 812-3456-7890")).toBe("081234567890");
    expect(normalizePhone("6281234567890")).toBe("081234567890");
    expect(normalizePhone("81234567890")).toBe("081234567890");
    expect(normalizePhone("021-5551234")).toBe("0215551234");
  });
});

describe("buildClientImportRows", () => {
  const existing = [{ name: "Andi", phone: "0811111111" }];

  it("reports missing required columns", () => {
    const { rows, missingColumns } = buildClientImportRows([["Nama", "Alamat"]], existing);
    expect(rows).toEqual([]);
    expect(missingColumns).toEqual(["Telepon"]);
  });

  it("validates rows and maps aliases/enums", () => {
    const { rows } = buildClientImportRows(
      [
        ["Nama", "No. HP", "Tipe Properti", "Sumber", "Status Lead"],
        ["Budi", "0812345678", "rumah", "Kaskus", "Deal"],
        ["", "", "", "", ""],
        ["Cici", "0811111111", "", "", ""],
        ["Dodi", "+62812345678", "", "", ""],
        ["", "0899999999", "", "", ""],
      ],
      existing
    );
    expect(rows.map((r) => r.line)).toEqual([2, 4, 5, 6]);
    expect(rows[0]).toEqual({
      line: 2,
      data: { name: "Budi", phone: "0812345678", property_type: "Rumah" },
      errors: [],
      warnings: ['Sumber "Kaskus" tidak dikenal, dikosongkan'],
    });
    expect(rows[1].errors).toEqual(['No. HP sudah dipakai client "Andi"']);
    expect(rows[2].errors).toEqual(["No. HP sama dengan baris 2"]);
    expect(rows[3].errors).toEqual(["Nama wajib diisi"]);
  });
});

describe("whatsappUrl", () => {
  it("builds wa.me links only for mobile numbers", async () => {
    const { whatsappUrl } = await import("./whatsapp");
    expect(whatsappUrl("0812-3456-7890")).toBe("https://wa.me/6281234567890");
    expect(whatsappUrl("+62 812 3456 7890")).toBe("https://wa.me/6281234567890");
    expect(whatsappUrl("021-5551234")).toBeNull();
    expect(whatsappUrl("")).toBeNull();
  });
});
