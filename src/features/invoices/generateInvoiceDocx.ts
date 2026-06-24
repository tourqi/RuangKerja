import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, PageOrientation,
  convertMillimetersToTwip, ShadingType, TableLayoutType,
  Header, Footer, ImageRun,
} from "docx";
import { saveAs } from "file-saver";
import type { Invoice, Client, Rab, RabGroup } from "@/types/db";

/* ─── Constants ──────────────────────────────────── */
const BLACK = "000000";
const NAVY  = "1a2560";
const MM    = convertMillimetersToTwip;

// A4: 210mm − 18mm kiri − 18mm kanan = 174mm
const CONTENT_W = MM(174);

const COL = {
  no:          MM(7),
  deskripsi:   MM(30),
  spesifikasi: MM(67),
  qty:         MM(11),
  sat:         MM(8),
  harga:       MM(23),
  total:       MM(28),
};

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

const ID_MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember",
];

function fmtDateLong(s?: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

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

/* ─── Text helpers ───────────────────────────────── */
function run(text: string, opts: {
  bold?: boolean; size?: number; color?: string;
  italic?: boolean; underline?: boolean;
} = {}): TextRun {
  return new TextRun({
    text,
    font:    "Cambria",
    bold:    opts.bold    ?? false,
    size:    opts.size    ?? 20,
    color:   opts.color   ?? BLACK,
    italics: opts.italic  ?? false,
    underline: opts.underline ? {} : undefined,
  });
}

function para(
  runs: TextRun[],
  align?: (typeof AlignmentType)[keyof typeof AlignmentType],
  spacing?: { before?: number; after?: number },
): Paragraph {
  return new Paragraph({
    alignment: align,
    spacing:   { before: spacing?.before ?? 0, after: spacing?.after ?? 0 },
    children:  runs,
  });
}

/* ─── Table cell helper ──────────────────────────── */
function tc(
  text: string,
  width: number,
  opts: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    shade?: string;
    rowSpan?: number;
    colSpan?: number;
    color?: string;
    size?: number;
  } = {},
): TableCell {
  return new TableCell({
    width:      { size: width, type: WidthType.DXA },
    borders:    thinBorders,
    rowSpan:    opts.rowSpan,
    columnSpan: opts.colSpan,
    shading:    opts.shade
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

/* ─── Borderless cell helper (untuk layout 2-kolom) ─ */
function tcBlank(
  content: Paragraph[],
  width: number,
  marginLeft = 0,
  marginRight = 0,
): TableCell {
  return new TableCell({
    width:   { size: width, type: WidthType.DXA },
    borders: noBorders,
    margins: { top: 0, bottom: 0, left: marginLeft, right: marginRight },
    children: content,
  });
}

/* ─── Fetch image ────────────────────────────────── */
async function fetchImageRun(url: string, widthMm: number): Promise<ImageRun> {
  const res  = await fetch(url);
  const data = await res.arrayBuffer();
  const blob = new Blob([data], { type: "image/png" });
  const objectUrl = URL.createObjectURL(blob);
  const img = new Image();
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = objectUrl; });
  URL.revokeObjectURL(objectUrl);
  const widthPx  = Math.round(widthMm / 25.4 * 96);
  const heightPx = Math.round(widthPx * img.naturalHeight / img.naturalWidth);
  return new ImageRun({ data, transformation: { width: widthPx, height: heightPx }, type: "png" });
}

/* ─── RAB table ──────────────────────────────────── */
function buildRabTable(groups: RabGroup[], diskonNilai: number, diskonPersen: number): Table {
  const groupSubtotal = (g: RabGroup) =>
    (g.items ?? []).reduce((s, i) => s + i.qty * i.harga, 0);
  const grandTotal = groups.reduce((s, g) => s + groupSubtotal(g), 0);
  const netTotal   = grandTotal - diskonNilai;

  const RIGHT  = AlignmentType.RIGHT;
  const CENTER = AlignmentType.CENTER;

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      tc("NO",          COL.no,          { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("DESKRIPSI",   COL.deskripsi,   { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("SPESIFIKASI", COL.spesifikasi, { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("QTY",         COL.qty,         { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("SAT",         COL.sat,         { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("HARGA",       COL.harga,       { bold: true, align: CENTER, shade: "E8E8E8" }),
      tc("TOTAL",       COL.total,       { bold: true, align: CENTER, shade: "E8E8E8" }),
    ],
  });

  const dataRows: TableRow[] = [];
  for (const group of groups) {
    const sub   = groupSubtotal(group);
    const items = group.items ?? [];

    items.forEach((item, idx) => {
      const qtyStr   = item.qty   > 0 ? item.qty.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
      const hargaStr = item.harga > 0 ? fmt(item.harga) : "";
      const totalStr = item.qty > 0 && item.harga > 0 ? fmt(item.qty * item.harga) : "";

      const cells: TableCell[] = [];
      if (idx === 0) {
        cells.push(
          tc(String(group.no), COL.no,        { align: CENTER, rowSpan: items.length || 1 }),
          tc(group.deskripsi,  COL.deskripsi, { bold: true,    rowSpan: items.length || 1 }),
        );
      }
      cells.push(
        tc(item.spesifikasi, COL.spesifikasi),
        tc(qtyStr,           COL.qty,   { align: RIGHT  }),
        tc(item.unit,        COL.sat,   { align: CENTER }),
        tc(hargaStr,         COL.harga, { align: RIGHT  }),
        tc(totalStr,         COL.total, { align: RIGHT  }),
      );
      dataRows.push(new TableRow({ children: cells }));
    });

    // Sub Total
    dataRows.push(new TableRow({
      children: [
        new TableCell({
          columnSpan: 6, borders: thinBorders,
          shading:  { type: ShadingType.SOLID, color: "F8F8F8", fill: "F8F8F8" },
          margins:  { top: 40, bottom: 40, left: 60, right: 60 },
          children: [para([run("Sub Total", { bold: true, size: 16 })], CENTER)],
        }),
        tc(fmt(sub), COL.total, { bold: true, align: RIGHT, shade: "F8F8F8" }),
      ],
    }));
  }

  // Total Sebelum Diskon
  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6, borders: thinBorders,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [para([run("Total Sebelum Diskon", { bold: true, size: 16 })], CENTER)],
      }),
      tc(fmt(grandTotal), COL.total, { bold: true, align: RIGHT }),
    ],
  });

  // Diskon
  const diskonLabel = diskonPersen > 0
    ? `Diskon (${Math.round(diskonPersen)}%)`
    : "Diskon";
  const diskonRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6, borders: thinBorders,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [para([run(diskonLabel, { size: 16 })], CENTER)],
      }),
      tc(diskonNilai > 0 ? `(${fmt(diskonNilai)})` : fmt(0), COL.total, { align: RIGHT }),
    ],
  });

  // Grand Total
  const grandTotalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6, borders: thinBorders,
        shading:  { type: ShadingType.SOLID, color: "E8E8E8", fill: "E8E8E8" },
        margins:  { top: 40, bottom: 40, left: 60, right: 60 },
        children: [para([run("GRAND TOTAL", { bold: true, size: 16 })], CENTER)],
      }),
      tc(fmt(netTotal), COL.total, { bold: true, align: RIGHT, shade: "E8E8E8" }),
    ],
  });

  return new Table({
    width:   { size: CONTENT_W, type: WidthType.DXA },
    layout:  TableLayoutType.FIXED,
    borders: thinBorders,
    rows:    [headerRow, ...dataRows, totalRow, diskonRow, grandTotalRow],
  });
}

/* ─── Tagihan Saat Ini table ─────────────────────── */
function buildTagihanTable(notes: string, amount: number): Table {
  return new Table({
    width:   { size: CONTENT_W, type: WidthType.DXA },
    layout:  TableLayoutType.FIXED,
    borders: thinBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2, borders: thinBorders,
            shading:  { type: ShadingType.SOLID, color: "E8E8E8", fill: "E8E8E8" },
            margins:  { top: 40, bottom: 40, left: 60, right: 60 },
            children: [para([run("Tagihan Saat Ini", { bold: true, size: 16 })], AlignmentType.CENTER)],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width:   { size: MM(146), type: WidthType.DXA },
            borders: thinBorders,
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [para([run(notes, { size: 16 })])],
          }),
          new TableCell({
            width:   { size: MM(28), type: WidthType.DXA },
            borders: thinBorders,
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [para([run(fmt(amount), { bold: true, size: 16 })], AlignmentType.RIGHT)],
          }),
        ],
      }),
    ],
  });
}

/* ─── Main export ────────────────────────────────── */
export async function generateInvoiceDocx(
  invoice: Invoice,
  client:  Client | undefined,
  rab:     Rab     | undefined,
  groups:  RabGroup[],
): Promise<void> {
  const [headerImgRun, footerImgRun] = await Promise.all([
    fetchImageRun("/header.png", 174),
    fetchImageRun("/footer.png", 174),
  ]);

  const margins = { top: MM(15), bottom: MM(20), left: MM(18), right: MM(18) };

  const diskonNilai  = invoice.diskon_nilai  ?? rab?.diskon_nilai  ?? 0;
  const diskonPersen = invoice.diskon_persen ?? rab?.diskon_persen ?? 0;
  const dateStr      = invoice.invoice_date  ?? invoice.created_at;

  /* ── Info header ── */
  const infoSection: (Paragraph | Table)[] = [
    para([run("INVOICE", { bold: true, size: 28, underline: true })],
      AlignmentType.CENTER, { before: MM(4), after: 0 }),
    para([run(`Nomor: ${invoice.invoice_number}`, { bold: true, size: 20 })],
      AlignmentType.CENTER, { before: 0, after: MM(4) }),

    para([run("Tagihan Untuk", { size: 20 })], undefined, { before: 0, after: 0 }),
    para([run(client?.name ?? "—", { bold: true, size: 20, color: NAVY })], undefined, { before: 0, after: 0 }),
    ...(client?.address
      ? [
          para([run("Alamat:", { size: 20 })], undefined, { before: 0, after: 0 }),
          para([run(client.address, { size: 20 })], undefined, { before: 0, after: 0 }),
        ]
      : []),
    ...(rab?.nama
      ? [
          para([run("Jenis Pekerjaan:", { size: 20 })], undefined, { before: 0, after: 0 }),
          para([run(rab.nama, { size: 20 })], undefined, { before: 0, after: MM(4) }),
        ]
      : [new Paragraph({ spacing: { before: 0, after: MM(4) }, children: [] })]),
  ];

  /* ── RAB table atau fallback ── */
  const rabTable = groups.length > 0
    ? buildRabTable(groups, diskonNilai, diskonPersen)
    : new Table({
        width:   { size: CONTENT_W, type: WidthType.DXA },
        layout:  TableLayoutType.FIXED,
        borders: thinBorders,
        rows: [
          new TableRow({ children: [
            tc("Keterangan", MM(146), { bold: true, shade: "E8E8E8" }),
            tc("Total",      MM(28),  { bold: true, align: AlignmentType.RIGHT, shade: "E8E8E8" }),
          ]}),
          new TableRow({ children: [
            tc(invoice.notes ?? "Jasa Pekerjaan", MM(146)),
            tc(fmt(invoice.total_amount), MM(28), { align: AlignmentType.RIGHT }),
          ]}),
          new TableRow({ children: [
            tc("GRAND TOTAL", MM(146), { bold: true, align: AlignmentType.CENTER, shade: "E8E8E8" }),
            tc(fmt(invoice.total_amount), MM(28), { bold: true, align: AlignmentType.RIGHT, shade: "E8E8E8" }),
          ]}),
        ],
      });

  /* ── Tagihan Saat Ini ── */
  const tagihanTable = buildTagihanTable(
    invoice.notes ?? "Termin Pembayaran",
    invoice.total_amount,
  );

  /* ── Layout 2-kolom: Keterangan | Tanda Tangan ── */
  const signatureTable = new Table({
    width:   { size: CONTENT_W, type: WidthType.DXA },
    layout:  TableLayoutType.FIXED,
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          tcBlank([
            para([run("Keterangan:",                                           { bold: true,  size: 18 })]),
            para([run("Pembayaran dapat dilakukan ke:",                        { size: 18 })]),
            para([run("BCA 6830659003 A.n Lutfi Wisda H.P",                   { bold: true,  size: 18 })]),
            para([run("Mohon konfirmasi apabila telah melakukan pembayaran.",  { size: 18 })]),
          ], MM(100), 0, MM(4)),
          tcBlank([
            para(
              [run(`Hormat Kami, Bogor, ${fmtDateLong(dateStr)}`, { size: 18 })],
              AlignmentType.CENTER,
            ),
            new Paragraph({ spacing: { before: MM(18), after: 0 }, children: [] }),
            para(
              [run("Muhamad Tourqi S.F", { bold: true, size: 18 })],
              AlignmentType.CENTER,
            ),
          ], MM(74), MM(4), 0),
        ],
      }),
    ],
  });

  /* ── Gabungkan semua konten ── */
  const children: (Paragraph | Table)[] = [
    ...infoSection,
    rabTable,
    new Paragraph({ spacing: { before: MM(4), after: MM(2) }, children: [] }),
    tagihanTable,
    new Paragraph({ spacing: { before: MM(8), after: 0 }, children: [] }),
    signatureTable,
  ];

  /* ── Build document ── */
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Cambria", size: 20 } },
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
            children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [headerImgRun] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [footerImgRun] })],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const label = rab?.nama ?? invoice.invoice_number;
  saveAs(blob, `Invoice-${label.replace(/\s+/g, "-")}-${invoice.invoice_number}.docx`);
}
