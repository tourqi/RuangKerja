import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Rab } from "@/types/db";

/* ─── Types ───────────────────────────────────────── */
interface ExcelItem {
  id: string;
  spesifikasi: string;
  qty: number;
  unit: string;
  harga: number;
}
interface ExcelGroup {
  id: string;
  no: number;
  deskripsi: string;
  items: ExcelItem[];
}

/* ─── Style helpers ───────────────────────────────── */
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  bottom: { style: "thin" },
  left: { style: "thin" },
  right: { style: "thin" },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8E8E8" },
};

const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF8F8F8" },
};

const GRANDTOTAL_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE8E8E8" },
};

const NUM_FMT = "#,##0";
const QTY_FMT = "#,##0.00";

/* ─── Main export ─────────────────────────────────── */
export async function generateRabExcel(rab: Rab, groups: ExcelGroup[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("RAB", {
    views: [{ showGridLines: false }],
  });

  ws.columns = [
    { key: "no", width: 6 },
    { key: "deskripsi", width: 24 },
    { key: "spesifikasi", width: 42 },
    { key: "qty", width: 10 },
    { key: "sat", width: 8 },
    { key: "harga", width: 16 },
    { key: "total", width: 18 },
  ];

  // ── Title ──
  ws.mergeCells("A1:G1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "RENCANA ANGGARAN BIAYA";
  titleCell.font = { bold: true, size: 13 };
  titleCell.alignment = { horizontal: "center" };

  ws.mergeCells("A2:G2");
  const nameCell = ws.getCell("A2");
  nameCell.value = rab.nama;
  nameCell.font = { bold: true, size: 11 };
  nameCell.alignment = { horizontal: "center" };

  // ── Column header row ──
  const headerRowIdx = 4;
  const headerRow = ws.getRow(headerRowIdx);
  const headerLabels = ["NO", "PEKERJAAN", "DESKRIPSI", "QTY", "SAT", "HARGA", "TOTAL"];
  headerLabels.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = HEADER_FILL;
    cell.border = THIN_BORDER;
  });

  let currentRow = headerRowIdx + 1;
  const subtotalRows: number[] = [];

  for (const group of groups) {
    const groupStartRow = currentRow;

    if (group.items.length === 0) {
      // Empty group — single row, no formula to build from
      const row = ws.getRow(currentRow);
      row.getCell(1).value = group.no;
      row.getCell(2).value = group.deskripsi;
      row.getCell(2).font = { bold: true };
      for (let c = 1; c <= 7; c++) row.getCell(c).border = THIN_BORDER;
      currentRow++;
    } else {
      group.items.forEach((item, idx) => {
        const row = ws.getRow(currentRow);
        if (idx === 0) {
          row.getCell(1).value = group.no;
          row.getCell(2).value = group.deskripsi;
          row.getCell(2).font = { bold: true };
        }
        row.getCell(3).value = item.spesifikasi;
        row.getCell(4).value = item.qty;
        row.getCell(4).numFmt = QTY_FMT;
        row.getCell(4).alignment = { horizontal: "right" };
        row.getCell(5).value = item.unit;
        row.getCell(5).alignment = { horizontal: "center" };
        row.getCell(6).value = item.harga;
        row.getCell(6).numFmt = NUM_FMT;
        row.getCell(6).alignment = { horizontal: "right" };
        row.getCell(7).value = { formula: `D${currentRow}*F${currentRow}` };
        row.getCell(7).numFmt = NUM_FMT;
        row.getCell(7).alignment = { horizontal: "right" };
        for (let c = 1; c <= 7; c++) row.getCell(c).border = THIN_BORDER;
        currentRow++;
      });
    }

    const groupEndRow = currentRow - 1;
    if (groupEndRow > groupStartRow) {
      ws.mergeCells(`A${groupStartRow}:A${groupEndRow}`);
      ws.mergeCells(`B${groupStartRow}:B${groupEndRow}`);
      ws.getCell(`A${groupStartRow}`).alignment = { horizontal: "center", vertical: "top" };
      ws.getCell(`B${groupStartRow}`).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    } else {
      ws.getCell(`A${groupStartRow}`).alignment = { horizontal: "center", vertical: "top" };
    }

    // Sub Total row
    const subRow = ws.getRow(currentRow);
    ws.mergeCells(`A${currentRow}:F${currentRow}`);
    const subLabelCell = subRow.getCell(1);
    subLabelCell.value = "Sub Total";
    subLabelCell.font = { bold: true };
    subLabelCell.alignment = { horizontal: "right" };
    const subTotalCell = subRow.getCell(7);
    subTotalCell.value = group.items.length > 0
      ? { formula: `SUM(G${groupStartRow}:G${groupEndRow})` }
      : 0;
    subTotalCell.font = { bold: true };
    subTotalCell.numFmt = NUM_FMT;
    subTotalCell.alignment = { horizontal: "right" };
    for (let c = 1; c <= 7; c++) {
      subRow.getCell(c).fill = SUBTOTAL_FILL;
      subRow.getCell(c).border = THIN_BORDER;
    }
    subtotalRows.push(currentRow);
    currentRow++;
  }

  // ── Total Sebelum Diskon ──
  const totalRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:F${currentRow}`);
  totalRow.getCell(1).value = "Total Sebelum Diskon";
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(1).alignment = { horizontal: "right" };
  const totalCell = totalRow.getCell(7);
  totalCell.value = subtotalRows.length > 0
    ? { formula: `SUM(${subtotalRows.map((r) => `G${r}`).join(",")})` }
    : 0;
  totalCell.font = { bold: true };
  totalCell.numFmt = NUM_FMT;
  totalCell.alignment = { horizontal: "right" };
  for (let c = 1; c <= 7; c++) totalRow.getCell(c).border = THIN_BORDER;
  const totalRowIdx = currentRow;
  currentRow++;

  // ── Diskon ──
  const diskonNilai = rab.diskon_nilai ?? 0;
  const diskonPersen = rab.diskon_persen ?? 0;
  const diskonRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:F${currentRow}`);
  diskonRow.getCell(1).value = diskonNilai > 0 && diskonPersen > 0
    ? `Diskon (${diskonPersen}%)`
    : "Diskon";
  diskonRow.getCell(1).alignment = { horizontal: "right" };
  const diskonCell = diskonRow.getCell(7);
  diskonCell.value = diskonNilai;
  diskonCell.numFmt = NUM_FMT;
  diskonCell.alignment = { horizontal: "right" };
  for (let c = 1; c <= 7; c++) diskonRow.getCell(c).border = THIN_BORDER;
  const diskonRowIdx = currentRow;
  currentRow++;

  // ── Grand Total ──
  const grandRow = ws.getRow(currentRow);
  ws.mergeCells(`A${currentRow}:F${currentRow}`);
  grandRow.getCell(1).value = "GRAND TOTAL";
  grandRow.getCell(1).font = { bold: true };
  grandRow.getCell(1).alignment = { horizontal: "right" };
  const grandCell = grandRow.getCell(7);
  grandCell.value = { formula: `G${totalRowIdx}-G${diskonRowIdx}` };
  grandCell.font = { bold: true };
  grandCell.numFmt = NUM_FMT;
  grandCell.alignment = { horizontal: "right" };
  for (let c = 1; c <= 7; c++) {
    grandRow.getCell(c).fill = GRANDTOTAL_FILL;
    grandRow.getCell(c).border = THIN_BORDER;
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `RAB-${rab.nama.replace(/\s+/g, "-")}.xlsx`);
}
