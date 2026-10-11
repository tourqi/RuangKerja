import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, PageOrientation,
  convertMillimetersToTwip, ShadingType, TableLayoutType,
  Header, Footer, ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import { Rab } from "@/types/db";
import type { SphConfig } from "./SphPrintView";
import { groupSubtotal as calcGroupSubtotal, grandTotal as calcGrandTotal } from "@/utils/rabCalculations";

/* ─── Constants ──────────────────────────────────── */
const BLACK = "000000";
const MM = convertMillimetersToTwip;

// A4 content width = 210mm − 18mm left − 18mm right = 174mm
const CONTENT_W = MM(174);

// Column widths — P dan L dihapus, lebarnya digabung ke spesifikasi
const COL = {
  no:          MM(7),
  deskripsi:   MM(30),
  spesifikasi: MM(67), // 49 + 9(P) + 9(L)
  qty:         MM(11),
  sat:         MM(8),
  harga:       MM(23),
  total:       MM(28),
};

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

/* ─── Border helpers ─────────────────────────────── */
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" } as const;
const THIN      = { style: BorderStyle.SINGLE, size: 4, color: BLACK } as const;

const noBorders = {
  top: NO_BORDER, bottom: NO_BORDER,
  left: NO_BORDER, right: NO_BORDER,
  insideH: NO_BORDER, insideV: NO_BORDER,
};

const thinBorders = {
  top: THIN, bottom: THIN,
  left: THIN, right: THIN,
  insideH: THIN, insideV: THIN,
};

/* ─── Text run helper ────────────────────────────── */
function run(text: string, opts: {
  bold?: boolean; size?: number; color?: string; italic?: boolean;
  allCaps?: boolean; spacing?: number;
} = {}) {
  return new TextRun({
    text,
    font:           "Cambria",
    bold:           opts.bold    ?? false,
    size:           opts.size    ?? 20,
    color:          opts.color   ?? BLACK,
    italics:        opts.italic  ?? false,
    allCaps:        opts.allCaps ?? false,
    characterSpacing: opts.spacing,
  });
}

function para(
  runs: TextRun[],
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
  spacing?: { before?: number; after?: number },
) {
  return new Paragraph({
    alignment: align,
    spacing:   { before: spacing?.before ?? 0, after: spacing?.after ?? 0 },
    children:  runs,
  });
}

/* ─── Cell helper for RAB table ─────────────────── */
function tc(
  text: string,
  width: number,
  opts: {
    bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shade?: string; rowSpan?: number; color?: string; size?: number;
  } = {},
): TableCell {
  return new TableCell({
    width:   { size: width, type: WidthType.DXA },
    borders: thinBorders,
    rowSpan: opts.rowSpan,
    shading: opts.shade
      ? { type: ShadingType.SOLID, color: opts.shade, fill: opts.shade }
      : undefined,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    children: [
      para([run(text, {
        bold:  opts.bold  ?? false,
        size:  opts.size  ?? 16,
        color: opts.color ?? BLACK,
      })], opts.align ?? AlignmentType.LEFT),
    ],
  });
}

/* ─── Fetch image + create ImageRun ─────────────── */
async function fetchImageRun(url: string, widthMm: number): Promise<ImageRun> {
  const response = await fetch(url);
  const data = await response.arrayBuffer();

  const blob = new Blob([data], { type: "image/png" });
  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = objectUrl; });
  URL.revokeObjectURL(objectUrl);

  const widthPx  = Math.round(widthMm / 25.4 * 96);
  const heightPx = Math.round(widthPx * img.naturalHeight / img.naturalWidth);

  return new ImageRun({
    data,
    transformation: { width: widthPx, height: heightPx },
    type: "png",
  });
}

/* ─── RAB table builder ──────────────────────────── */
interface PrintItem {
  id: string; spesifikasi: string;
  qty: number; unit: string; harga: number;
}
interface PrintGroup {
  id: string; no: number; deskripsi: string; items: PrintItem[];
}

function buildRabTable(groups: PrintGroup[], rab: Rab): Table {
  const groupSubtotal = (g: PrintGroup) => calcGroupSubtotal(g);
  const grandTotal = calcGrandTotal(groups);
  const diskon     = rab.diskon_nilai ?? 0;
  const netTotal   = grandTotal - diskon;

  const RIGHT  = AlignmentType.RIGHT;
  const CENTER = AlignmentType.CENTER;

  // ── Header row (single row — no DIMENSI) ──
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      tc("NO",          COL.no,          { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("PEKERJAAN",   COL.deskripsi,   { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("DESKRIPSI", COL.spesifikasi, { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("QTY",         COL.qty,         { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("SAT",         COL.sat,         { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("HARGA",       COL.harga,       { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("TOTAL",       COL.total,       { bold: true, align: CENTER, shade: "E8E8E8" }),
    ],
  });

  // ── Data rows ──
  const dataRows: TableRow[] = [];

  for (const group of groups) {
    const sub = groupSubtotal(group);

    group.items.forEach((item, idx) => {
      const qtyStr   = item.qty   > 0 ? item.qty.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
      const hargaStr = item.harga > 0 ? fmt(item.harga) : "";
      const totalStr = item.qty > 0 && item.harga > 0 ? fmt(item.qty * item.harga) : "";

      const rowCells: TableCell[] = [];
      if (idx === 0) {
        rowCells.push(
          tc(String(group.no), COL.no,        { align: CENTER, rowSpan: group.items.length }),
          tc(group.deskripsi,  COL.deskripsi, { bold: true,    rowSpan: group.items.length }),
        );
      }
      rowCells.push(
        tc(item.spesifikasi, COL.spesifikasi),
        tc(qtyStr,           COL.qty,   { align: RIGHT  }),
        tc(item.unit,        COL.sat,   { align: CENTER }),
        tc(hargaStr,         COL.harga, { align: RIGHT  }),
        tc(totalStr,         COL.total, { align: RIGHT  }),
      );
      dataRows.push(new TableRow({ children: rowCells }));
    });

    // Sub Total row
    dataRows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          borders: thinBorders,
          shading: { type: ShadingType.SOLID, color: "F8F8F8", fill: "F8F8F8" },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [para([run("Sub Total", { bold: true, size: 16 })], CENTER)],
        }),
        tc(fmt(sub), COL.total, { bold: true, align: RIGHT, shade: "F8F8F8" }),
      ],
    }));
  }

  // ── Total Sebelum Diskon ──
  const totalSebelumDiskonRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6,
        borders: thinBorders,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [para([run("Total Sebelum Diskon", { bold: true, size: 16 })], CENTER)],
      }),
      tc(fmt(grandTotal), COL.total, { bold: true, align: RIGHT }),
    ],
  });

  // ── Diskon ──
  const diskonLabel = diskon > 0 && (rab.diskon_persen ?? 0) > 0
    ? `Diskon (${rab.diskon_persen}%)`
    : "Diskon";
  const diskonRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6,
        borders: thinBorders,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [para([run(diskonLabel, { size: 16 })], CENTER)],
      }),
      tc(diskon > 0 ? `(${fmt(diskon)})` : fmt(0), COL.total, { align: RIGHT }),
    ],
  });

  // ── Grand Total ──
  const grandTotalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6,
        borders: thinBorders,
        shading: { type: ShadingType.SOLID, color: "E8E8E8", fill: "E8E8E8" },
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [para([run("GRAND TOTAL", { bold: true, size: 16 })], CENTER)],
      }),
      tc(fmt(netTotal), COL.total, { bold: true, align: RIGHT, shade: "E8E8E8" }),
    ],
  });

  return new Table({
    width:   { size: CONTENT_W, type: WidthType.DXA },
    layout:  TableLayoutType.FIXED,
    borders: thinBorders,
    rows:    [headerRow, ...dataRows, totalSebelumDiskonRow, diskonRow, grandTotalRow],
  });
}

/* ─── Default payment terms ─────────────────────── */
const DEFAULT_TERMIN = [
  { label: "Progres 0% sd 30% : Dibayar DP 30%",                                                     pct: 0.3  },
  { label: "Progres Pekerjaan 31% sd 60% dan Pemasangan 50%: Dibayar 30%",                           pct: 0.3  },
  { label: "Progres Pekerjaan 76% sd 90% & Pemasangan 70%: Dibayar 30%",                             pct: 0.3  },
  { label: "Progress Pekerjaan dan Pemasangan 100% dan BAST Sudah Ditandatangan: Dibayar 10%",       pct: 0.1  },
];

/* ─── Termin table ───────────────────────────────── */
function buildTerminTable(netTotal: number, termin: Array<{ label: string; pct: number }>): Table {
  return new Table({
    width:   { size: CONTENT_W, type: WidthType.DXA },
    layout:  TableLayoutType.FIXED,
    borders: thinBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            borders: thinBorders,
            shading: { type: ShadingType.SOLID, color: "E8E8E8", fill: "E8E8E8" },
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [para([run("Pembagian Termin Pembayaran", { bold: true, size: 16 })], AlignmentType.CENTER)],
          }),
        ],
      }),
      ...termin.map((t) => new TableRow({
        children: [
          new TableCell({
            width:   { size: MM(146), type: WidthType.DXA },
            borders: thinBorders,
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [para([run(t.label, { size: 16 })])],
          }),
          new TableCell({
            width:   { size: MM(28), type: WidthType.DXA },
            borders: thinBorders,
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [para([run(fmt(Math.round(netTotal * t.pct)), { bold: true, size: 16 })], AlignmentType.RIGHT)],
          }),
        ],
      })),
    ],
  });
}

/* ─── Main export ────────────────────────────────── */
export async function generateSphDocx(
  rab: Rab,
  groups: PrintGroup[],
  config: SphConfig,
): Promise<void> {
  const ROMAN_MONTHS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
  const now = new Date();
  const nomorSph = config.nomorSph ||
    `001/SPH/${ROMAN_MONTHS[now.getMonth()]}/${now.getFullYear()}`;

  const grandTotal = calcGrandTotal(groups);
  const netTotal   = grandTotal - (rab.diskon_nilai ?? 0);

  // Fetch header & footer images
  const [headerImgRun, footerImgRun] = await Promise.all([
    fetchImageRun("/header.png", 174),
    fetchImageRun("/footer.png", 174),
  ]);

  const margins = {
    top: MM(15), bottom: MM(20),
    left: MM(18), right: MM(18),
  };

  /* ── Page 1 — Surat Penawaran Harga ── */
  const page1: Paragraph[] = [
    new Paragraph({ spacing: { before: MM(6), after: 0 }, children: [
      run("Nomor", { size: 20 }),
      run("     : ", { size: 20 }),
      run(nomorSph, { size: 20 }),
    ]}),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [
      run("Lampiran", { size: 20 }),
      run(" : ", { size: 20 }),
      run("1 (satu) berkas RAB", { size: 20 }),
    ]}),
    new Paragraph({ spacing: { before: 0, after: MM(5) }, children: [
      run("Hal", { size: 20 }),
      run("        : ", { size: 20 }),
      run(`Penawaran Pekerjaan - ${rab.nama}`, { size: 20 }),
    ]}),

    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run("Kepada Yth.", { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run([config.greeting, config.clientName].filter(Boolean).join(" "), { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: MM(5) }, children: [run("Di Tempat", { size: 20 })] }),

    new Paragraph({ spacing: { before: 0, after: MM(3) }, children: [run("Dengan hormat,", { size: 20 })] }),

    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: MM(3) },
      children: [run(
        `Sehubungan dengan rencana pekerjaan ${rab.nama}, bersama ini kami sampaikan ` +
        `Rencana Anggaran Biaya (RAB) sebagai bahan pertimbangan dan acuan. Dokumen RAB tersebut telah ` +
        `kami susun berdasarkan spesifikasi pekerjaan, kebutuhan material, dan ketentuan yang telah dibicarakan sebelumnya.`,
        { size: 20 },
      )],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: MM(3) },
      children: [run(
        `Kami berharap rincian yang kami sampaikan ini dapat membantu Bapak/Ibu dalam menentukan pilihan ` +
        `terbaik sesuai kebutuhan dan anggaran yang tersedia. Apabila diperlukan, kami siap memberikan ` +
        `penjelasan lebih detail atau melakukan penyesuaian sesuai masukan dari Bapak/Ibu.`,
        { size: 20 },
      )],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: MM(8) },
      children: [run(
        `Demikian surat penawaran ini kami sampaikan. Atas perhatian, waktu, dan kerja sama yang baik ` +
        `dari Bapak/Ibu, kami ucapkan terima kasih.`,
        { size: 20 },
      )],
    }),

    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(`${config.kota}, ${config.tanggal}`, { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: MM(18) }, children: [run("Hormat kami,", { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(config.penandatangan, { bold: true, size: 20 })] }),
  ];

  /* ── Page 2 — Lampiran ── */
  const termin = (rab.skema_pembayaran ?? []).length > 0
    ? rab.skema_pembayaran!.map((s) => ({ label: s.keterangan, pct: s.persen / 100 }))
    : DEFAULT_TERMIN;

  const page2: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: MM(4), after: MM(2) }, children: [run("Lampiran", { size: 18 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 0 },
      children:  [run("LAMPIRAN", { bold: true, size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: MM(4) },
      children:  [run("RANCANGAN ANGGARAN BIAYA", { bold: true, size: 20 })],
    }),
    buildRabTable(groups, rab),
    new Paragraph({ spacing: { before: MM(6), after: 0 }, children: [] }),
    buildTerminTable(netTotal, termin),
  ];

  /* ── Build document ── */
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Cambria", size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size:   { width: MM(210), height: MM(297), orientation: PageOrientation.PORTRAIT },
            margin: margins,
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [headerImgRun],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [footerImgRun],
              }),
            ],
          }),
        },
        children: [
          ...page1,
          new Paragraph({ pageBreakBefore: true, spacing: { before: 0, after: 0 }, children: [] }),
          ...page2,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `SPH-${rab.nama.replace(/\s+/g, "-")}.docx`);
}
