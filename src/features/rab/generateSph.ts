import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, PageOrientation,
  convertMillimetersToTwip, ShadingType, TableLayoutType,
  Header, Footer, PageNumber, NumberFormat,
} from "docx";
import { saveAs } from "file-saver";
import { Rab } from "@/types/db";
import type { SphConfig } from "./SphPrintView";

/* ─── Constants ──────────────────────────────────── */
const NAVY  = "1A2560";
const GOLD  = "C8A84B";
const BLACK = "000000";
const WHITE = "FFFFFF";

const MM = convertMillimetersToTwip;

// A4 content width = 210mm − 18mm left − 18mm right = 174mm
const CONTENT_W = MM(174);

// Column widths in twips (must sum to CONTENT_W = 9864)
const COL = {
  no:       MM(7),
  deskripsi:MM(30),
  p:        MM(9),
  l:        MM(9),
  spesifikasi: MM(49),
  qty:      MM(11),
  sat:      MM(8),
  harga:    MM(23),
  total:    MM(28),
};

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

/* ─── Border helpers ─────────────────────────────── */
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" } as const;
const THIN      = { style: BorderStyle.SINGLE, size: 4, color: BLACK } as const;
const THICK     = { style: BorderStyle.SINGLE, size: 6, color: BLACK } as const;
const GOLD_LINE = { style: BorderStyle.SINGLE, size: 12, color: GOLD  } as const;

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
    bold:           opts.bold   ?? false,
    size:           opts.size   ?? 20,        // half-points (10pt = 20)
    color:          opts.color  ?? BLACK,
    italics:        opts.italic ?? false,
    allCaps:        opts.allCaps ?? false,
    characterSpacing: opts.spacing,
  });
}

function para(runs: TextRun[], align?: (typeof AlignmentType)[keyof typeof AlignmentType], spacing?: { before?: number; after?: number }) {
  return new Paragraph({
    alignment: align,
    spacing:   { before: spacing?.before ?? 0, after: spacing?.after ?? 0 },
    children:  runs,
  });
}

/* ─── Company header table (kop surat) ──────────── */
function buildKopTable(): Table {
  const cellOpts = {
    borders: noBorders,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  return new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: {
      ...noBorders,
      bottom: GOLD_LINE,
    },
    rows: [
      new TableRow({
        children: [
          /* Left: Company name + CONSTRUCTION */
          new TableCell({
            ...cellOpts,
            width: { size: MM(70), type: WidthType.DXA },
            children: [
              para([
                run("PT PESHA SURYA", { bold: true, size: 28, color: NAVY }),
              ]),
              para([
                run("CONSTRUCTION", { bold: true, size: 14, color: GOLD, spacing: 200, allCaps: true }),
              ]),
            ],
          }),
          /* Right: Tagline */
          new TableCell({
            ...cellOpts,
            width: { size: MM(104), type: WidthType.DXA },
            children: [
              para([
                run("INTERIOR, EKSTERIOR, KONTRAKTOR BANGUNAN,", { bold: true, size: 16, color: NAVY }),
              ], AlignmentType.RIGHT),
              para([
                run("ALUMUNIUM, BAJA RINGAN, GLASS ART,DLL", { bold: true, size: 16, color: NAVY }),
              ], AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ─── Cell helper for RAB table ─────────────────── */
function tc(
  text: string,
  width: number,
  opts: {
    bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; shade?: boolean;
    rowSpan?: number; color?: string; size?: number;
  } = {}
): TableCell {
  return new TableCell({
    width:   { size: width, type: WidthType.DXA },
    borders: thinBorders,
    rowSpan: opts.rowSpan,
    shading: opts.shade
      ? { type: ShadingType.SOLID, color: "F0F0F0", fill: "F0F0F0" }
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

/* ─── RAB table builder ──────────────────────────── */
interface PrintItem {
  id: string; spesifikasi: string;
  qty: number; unit: string; harga: number;
  dimensi_p?: number; dimensi_l?: number;
}
interface PrintGroup {
  id: string; no: number; deskripsi: string; items: PrintItem[];
}

function buildRabTable(groups: PrintGroup[], grandTotal: number): Table {
  const groupSubtotal = (g: PrintGroup) =>
    g.items.reduce((s, i) => s + i.qty * i.harga, 0);

  const RIGHT  = AlignmentType.RIGHT;
  const CENTER = AlignmentType.CENTER;

  // ── Header rows ──
  const headerRow1 = new TableRow({
    tableHeader: true,
    children: [
      tc("NO",          COL.no,          { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
      tc("DESKRIPSI",   COL.deskripsi,   { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
      tc("P",           COL.p,           { bold: true, align: CENTER, shade: true }),
      tc("L",           COL.l,           { bold: true, align: CENTER, shade: true }),
      tc("SPESIFIKASI", COL.spesifikasi, { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
      tc("QTY",         COL.qty,         { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
      tc("SAT",         COL.sat,         { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
      tc("HARGA",       COL.harga,       { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
      tc("TOTAL",       COL.total,       { bold: true, align: CENTER, shade: true, rowSpan: 2 }),
    ],
  });

  const headerRow2 = new TableRow({
    tableHeader: true,
    children: [
      tc("DIMENSI", COL.p,           { bold: true, align: CENTER, shade: true }),
      tc("(m)",     COL.l,           { bold: true, align: CENTER, shade: true }),
    ],
  });

  // ── Data rows ──
  const dataRows: TableRow[] = [];

  for (const group of groups) {
    const sub = groupSubtotal(group);

    group.items.forEach((item, idx) => {
      const dp = item.dimensi_p && item.dimensi_p > 0
        ? item.dimensi_p.toLocaleString("id-ID", { maximumFractionDigits: 2 })
        : "";
      const dl = item.dimensi_l && item.dimensi_l > 0
        ? item.dimensi_l.toLocaleString("id-ID", { maximumFractionDigits: 2 })
        : "";
      const qtyStr = item.qty > 0
        ? item.qty.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "";
      const hargaStr = item.harga > 0 ? fmt(item.harga) : "";
      const totalStr = item.qty > 0 && item.harga > 0 ? fmt(item.qty * item.harga) : "";

      const rowCells: TableCell[] = [];

      if (idx === 0) {
        rowCells.push(
          tc(String(group.no),  COL.no,          { align: CENTER,  rowSpan: group.items.length }),
          tc(group.deskripsi,   COL.deskripsi,   { bold: true,     rowSpan: group.items.length }),
        );
      }

      rowCells.push(
        tc(dp,        COL.p,           { align: CENTER }),
        tc(dl,        COL.l,           { align: CENTER }),
        tc(item.spesifikasi, COL.spesifikasi),
        tc(qtyStr,    COL.qty,         { align: RIGHT  }),
        tc(item.unit, COL.sat,         { align: CENTER }),
        tc(hargaStr,  COL.harga,       { align: RIGHT  }),
        tc(totalStr,  COL.total,       { align: RIGHT  }),
      );

      dataRows.push(new TableRow({ children: rowCells }));
    });

    // Subtotal row
    dataRows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 8,
          borders:    thinBorders,
          shading:    { type: ShadingType.SOLID, color: "F8F8F8", fill: "F8F8F8" },
          margins:    { top: 40, bottom: 40, left: 60, right: 60 },
          children:   [para([run("Sub Total", { bold: true, size: 16 })], AlignmentType.CENTER)],
        }),
        tc(fmt(sub), COL.total, { bold: true, align: RIGHT, shade: true }),
      ],
    }));
  }

  // Grand total row
  const grandTotalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 8,
        borders:    thinBorders,
        shading:    { type: ShadingType.SOLID, color: "E8E8E8", fill: "E8E8E8" },
        margins:    { top: 40, bottom: 40, left: 60, right: 60 },
        children:   [para([run("GRAND TOTAL", { bold: true, size: 16 })], AlignmentType.CENTER)],
      }),
      tc(fmt(grandTotal), COL.total, { bold: true, align: RIGHT, shade: true }),
    ],
  });

  return new Table({
    width:   { size: CONTENT_W, type: WidthType.DXA },
    layout:  TableLayoutType.FIXED,
    borders: thinBorders,
    rows:    [headerRow1, headerRow2, ...dataRows, grandTotalRow],
  });
}

/* ─── Termin table ───────────────────────────────── */
function buildTerminTable(grandTotal: number): Table {
  const TERMIN = [
    { label: "Progres 0% sd 30% : Dibayar DP 30%",                                                     pct: 0.3  },
    { label: "Progres Pekerjaan 31% sd 60% dan Pemasangan 50%: Dibayar 30%",                           pct: 0.3  },
    { label: "Progres Pekerjaan 76% sd 90% & Pemasangan 70%: Dibayar 30%",                             pct: 0.3  },
    { label: "Progress Pekerjaan dan Pemasangan 100% dan BAST Sudah Ditandatangan: Dibayar 10%",       pct: 0.1  },
  ];

  return new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: thinBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            borders:    thinBorders,
            shading:    { type: ShadingType.SOLID, color: "E8E8E8", fill: "E8E8E8" },
            margins:    { top: 40, bottom: 40, left: 60, right: 60 },
            children:   [para([run("Pembagian Termin Pembayaran", { bold: true, size: 16 })], AlignmentType.CENTER)],
          }),
        ],
      }),
      ...TERMIN.map((t) => new TableRow({
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
            children: [para([run(fmt(Math.round(grandTotal * t.pct)), { bold: true, size: 16 })], AlignmentType.RIGHT)],
          }),
        ],
      })),
    ],
  });
}

/* ─── Contact footer paragraph ──────────────────── */
function contactFooter(): Paragraph[] {
  return [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
      spacing: { before: MM(4), after: 60 },
      children: [
        run("✉  peshasuryaconstruction@gmail.com    ", { size: 16 }),
        run("   📍  Lingkungan 02 citatah Dalam, Rt 04/Rw 04 (No 83), Kab. Bogor, Cibinong, Jawa Barat, ID, 16918", { size: 16 }),
      ],
    }),
  ];
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

  const groupSubtotal = (g: PrintGroup) =>
    g.items.reduce((s, i) => s + i.qty * i.harga, 0);
  const grandTotal = groups.reduce((s, g) => s + groupSubtotal(g), 0);

  const margins = {
    top:    MM(15), bottom: MM(20),
    left:   MM(18), right:  MM(18),
  };

  /* ── Page 1 — Surat Penawaran Harga ── */
  const page1: Paragraph[] = [
    /* Nomor / Lampiran / Hal */
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

    /* Recipient */
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run("Kepada Yth.", { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(`${config.greeting} ${config.clientName}`, { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: MM(5) }, children: [run("Di Tempat", { size: 20 })] }),

    /* Salutation */
    new Paragraph({ spacing: { before: 0, after: MM(3) }, children: [run("Dengan hormat,", { size: 20 })] }),

    /* Body */
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: MM(3) },
      children: [run(
        `Sehubungan dengan rencana pekerjaan penataan Interior Full House, bersama ini kami sampaikan ` +
        `Rencana Anggaran Biaya (RAB) sebagai bahan pertimbangan dan acuan. Dokumen RAB tersebut telah ` +
        `kami susun berdasarkan spesifikasi pekerjaan, kebutuhan material, dan ketentuan yang telah dibicarakan sebelumnya.`,
        { size: 20 }
      )],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: MM(3) },
      children: [run(
        `Kami berharap rincian yang kami sampaikan ini dapat membantu ${config.greeting} ` +
        `${config.clientName.split(" ")[0]} dalam menentukan pilihan terbaik sesuai kebutuhan dan anggaran ` +
        `yang tersedia. Apabila diperlukan, kami siap memberikan penjelasan lebih detail atau melakukan penyesuaian sesuai masukan dari ${config.greeting}.`,
        { size: 20 }
      )],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: MM(8) },
      children: [run(
        `Demikian surat penawaran ini kami sampaikan. Atas perhatian, waktu, dan kerja sama yang baik dari ` +
        `${config.greeting}, kami ucapkan terima kasih.`,
        { size: 20 }
      )],
    }),

    /* Closing */
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(`${config.kota}, ${config.tanggal}`, { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: MM(18) }, children: [run("Hormat kami,", { size: 20 })] }),
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [run(config.penandatangan, { bold: true, size: 20 })] }),
  ];

  /* ── Page 2 — Lampiran I ── */
  const page2: (Paragraph | Table)[] = [
    new Paragraph({ spacing: { before: MM(4), after: MM(2) }, children: [run("Lampiran I", { size: 18 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: 0 },
      children:  [run("RENCANA ANGGARAN BIAYA", { bold: true, size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing:   { before: 0, after: MM(4) },
      children:  [run(`PEKERJAAN INTERIOR ${rab.nama.toUpperCase()}`, { bold: true, size: 20 })],
    }),
    buildRabTable(groups, grandTotal),
    new Paragraph({ spacing: { before: MM(6), after: 0 }, children: [] }),
    buildTerminTable(grandTotal),
  ];

  /* ── Build document ── */
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size:    { width: MM(210), height: MM(297), orientation: PageOrientation.PORTRAIT },
            margin:  margins,
          },
        },
        headers: {
          default: new Header({
            children: [
              buildKopTable(),
              new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }),
            ],
          }),
        },
        footers: {
          default: new Footer({ children: contactFooter() }),
        },
        children: [
          ...page1,
          /* Page break before lampiran */
          new Paragraph({
            pageBreakBefore: true,
            spacing: { before: 0, after: 0 },
            children: [],
          }),
          ...page2,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `SPH-${rab.nama.replace(/\s+/g, "-")}.docx`;
  saveAs(blob, fileName);
}
