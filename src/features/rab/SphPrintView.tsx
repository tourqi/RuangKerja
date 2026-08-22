"use client";
import React, { useEffect } from "react";
import { Rab } from "@/types/db";
import { groupSubtotal as calcGroupSubtotal, grandTotal as calcGrandTotal } from "@/utils/rabCalculations";

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(v);

const ROMAN_MONTHS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

export interface SphConfig {
  nomorSph: string;
  kota: string;
  tanggal: string;
  greeting: string;
  clientName: string;
  penandatangan: string;
}

interface PrintItem {
  id: string;
  spesifikasi: string;
  qty: number;
  unit: string;
  harga: number;
  dimensi_p?: number;
  dimensi_l?: number;
}

interface PrintGroup {
  id: string;
  no: number;
  deskripsi: string;
  items: PrintItem[];
}

interface Props {
  rab: Rab;
  groups: PrintGroup[];
  config: SphConfig;
  onClose: () => void;
}

/* ─── Brand constants ─────────────────────────────── */
const NAVY = "#1a2560";

/* ─── Default payment terms (fallback if no skema set) ─ */
const DEFAULT_TERMIN = [
  { label: "Progres 0% sd 30% : Dibayar DP 30%",                                                      pct: 0.3  },
  { label: "Progres Pekerjaan 31% sd 60% dan Pemasangan 50%: Dibayar 30%",                            pct: 0.3  },
  { label: "Progres Pekerjaan 76% sd 90% & Pemasangan 70%: Dibayar 30%",                              pct: 0.3  },
  { label: "Progress Pekerjaan dan Pemasangan 100% dan BAST Sudah Ditandatangan: Dibayar 10%",        pct: 0.1  },
];

/* ─── Logo SVG (approximate PT PESHA SURYA badge) ──── */
/* ─── Kop header (shared between pages) ─────────────── */
function KopHeader() {
  return (
    <div style={{ width: "100%", lineHeight: 0 }}>
      <img src="/header.png" alt="" style={{ width: "100%", display: "block" }} />
    </div>
  );
}

/* ─── Kop footer (shared between pages) ─────────────── */
function KopFooter() {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
      <img src="/footer.png" alt="" style={{ width: "100%", display: "block" }} />
    </div>
  );
}

/* Thin separator line that appears between kop and body */
function Separator() {
  return <div style={{ borderBottom: `1.5px solid ${NAVY}`, marginBottom: "6mm" }} />;
}

/* ─── Main component ─────────────────────────────────── */
export default function SphPrintView({ rab, groups, config, onClose }: Props) {
  useEffect(() => {
    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  const groupSubtotal = (g: PrintGroup) => calcGroupSubtotal(g);
  const grandTotal = calcGrandTotal(groups);
  const netTotal = grandTotal - (rab.diskon_nilai ?? 0);

  const termin = (rab.skema_pembayaran ?? []).length > 0
    ? rab.skema_pembayaran!.map((s) => ({ label: s.keterangan, pct: s.persen / 100 }))
    : DEFAULT_TERMIN;

  const now   = new Date();
  const nomorSph = config.nomorSph ||
    `001/SPH/${ROMAN_MONTHS[now.getMonth()]}/${now.getFullYear()}`;

  return (
    <div className="hidden print:block sph-print">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .sph-print, .sph-print * { visibility: visible; }
          .sph-print { position: absolute; top: 0; left: 0; width: 100%; }
          .sph-page {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            page-break-after: always;
            overflow: hidden;
          }
          .sph-page:last-child { page-break-after: auto; }
          .sph-body { padding: 2mm 18mm 26mm; font-family: 'Cambria', 'Times New Roman', serif; font-size: 10pt; }
          .rab-table { border-collapse: collapse; width: 100%; font-size: 8pt; }
          .rab-table th, .rab-table td { border: 1px solid #000; padding: 2.5px 4px; vertical-align: middle; }
          .rab-table th { text-align: center; font-weight: bold; }
          .subtotal-row td { background: #f8f8f8; }
          .grand-total-row td { background: #f0f0f0; font-weight: bold; }
          .termin-table { border-collapse: collapse; width: 100%; font-size: 8pt; margin-top: 10px; }
          .termin-table td { border: 1px solid #000; padding: 3px 6px; }
        }
        .sph-print { font-family: 'Cambria', 'Times New Roman', serif; font-size: 10pt; color: #000; }
        .sph-page { position: relative; width: 210mm; min-height: 297mm; box-sizing: border-box; overflow: hidden; }
        .sph-body { padding: 2mm 18mm 26mm; }
      `}</style>

      {/* ════════════════════════════════════════
          PAGE 1 — SURAT PENAWARAN HARGA
      ════════════════════════════════════════ */}
      <div className="sph-page">
        <KopHeader />

        <div className="sph-body">
          <Separator />

          {/* Nomor / Lampiran / Hal */}
          <div style={{ marginBottom: "5mm", fontSize: "10pt", fontFamily: "'Cambria', 'Times New Roman', serif" }}>
            {([
              ["Nomor",    nomorSph],
              ["Lampiran", "1 (satu) berkas RAB"],
              ["Hal",      `Penawaran Pekerjaan - ${rab.nama}`],
            ] as [string, string][]).map(([lbl, val]) => (
              <div key={lbl} style={{ display: "flex", marginBottom: "1.5px" }}>
                <span style={{ width: "68px" }}>{lbl}</span>
                <span style={{ marginRight: "8px" }}>:</span>
                <span>{val}</span>
              </div>
            ))}
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: "5mm", fontSize: "10pt" }}>
            <div>Kepada Yth.</div>
            <div>{[config.greeting, config.clientName].filter(Boolean).join(" ")}</div>
            <div>Di Tempat</div>
          </div>

          {/* Salutation */}
          <div style={{ marginBottom: "3mm", fontSize: "10pt" }}>Dengan hormat,</div>

          {/* Body text */}
          <div style={{ fontSize: "10pt", textAlign: "justify", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 3.5mm" }}>
              Sehubungan dengan rencana pekerjaan {rab.nama}, bersama ini kami sampaikan Rencana
              Anggaran Biaya (RAB) sebagai bahan pertimbangan dan acuan. Dokumen RAB tersebut telah
              kami susun berdasarkan spesifikasi pekerjaan, kebutuhan material, dan ketentuan yang
              telah dibicarakan sebelumnya.
            </p>
            <p style={{ margin: "0 0 3.5mm" }}>
              Kami berharap rincian yang kami sampaikan ini dapat membantu Bapak/Ibu dalam
              menentukan pilihan terbaik sesuai kebutuhan dan anggaran yang tersedia. Apabila
              diperlukan, kami siap memberikan penjelasan lebih detail atau melakukan penyesuaian
              sesuai masukan dari Bapak/Ibu.
            </p>
            <p style={{ margin: 0 }}>
              Demikian surat penawaran ini kami sampaikan. Atas perhatian, waktu, dan kerja sama
              yang baik dari Bapak/Ibu, kami ucapkan terima kasih.
            </p>
          </div>

          {/* Closing / signature */}
          <div style={{ marginTop: "8mm", fontSize: "10pt" }}>
            <div>{config.kota}, {config.tanggal}</div>
            <div style={{ marginTop: "2px" }}>Hormat kami,</div>
            <div style={{ height: "18mm" }} />
            <div style={{ fontWeight: "600" }}>{config.penandatangan}</div>
          </div>
        </div>

        <KopFooter />
      </div>

      {/* ════════════════════════════════════════
          PAGE 2 — LAMPIRAN I (RAB TABLE)
      ════════════════════════════════════════ */}
      <div className="sph-page">
        <KopHeader />

        <div className="sph-body">
          <Separator />

          <div style={{ fontSize: "8.5pt", marginBottom: "3mm", fontFamily: "'Cambria', 'Times New Roman', serif" }}>
            Lampiran I
          </div>

          <div style={{
            textAlign: "center", fontWeight: "bold",
            fontSize: "9.5pt", marginBottom: "4mm",
            textTransform: "uppercase",
            fontFamily: "'Cambria', 'Times New Roman', serif",
          }}>
            <div>Lampiran</div>
            <div>Rancangan Anggaran Biaya</div>
          </div>

          <table className="rab-table">
            <thead>
              <tr>
                <th style={{ width: "22px" }}>NO</th>
                <th style={{ width: "90px" }}>DESKRIPSI</th>
                <th>SPESIFIKASI</th>
                <th style={{ width: "34px" }}>QTY</th>
                <th style={{ width: "26px" }}>SAT</th>
                <th style={{ width: "68px" }}>HARGA</th>
                <th style={{ width: "76px" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const sub = groupSubtotal(group);
                return (
                  <React.Fragment key={group.id}>
                    {group.items.map((item, idx) => (
                      <tr key={item.id}>
                        {idx === 0 && (
                          <>
                            <td style={{ textAlign: "center", verticalAlign: "top", fontSize: "7.5pt" }} rowSpan={group.items.length || 1}>
                              {group.no}
                            </td>
                            <td style={{ verticalAlign: "top", fontWeight: "600", fontSize: "7.5pt" }} rowSpan={group.items.length || 1}>
                              {group.deskripsi}
                            </td>
                          </>
                        )}
                        <td style={{ fontSize: "7.5pt" }}>{item.spesifikasi}</td>
                        <td style={{ textAlign: "right", fontSize: "7.5pt" }}>
                          {item.qty > 0
                            ? item.qty.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : ""}
                        </td>
                        <td style={{ textAlign: "center", fontSize: "7.5pt" }}>{item.unit}</td>
                        <td style={{ textAlign: "right", fontSize: "7.5pt" }}>
                          {item.harga > 0 ? fmt(item.harga) : ""}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "7.5pt" }}>
                          {item.qty > 0 && item.harga > 0 ? fmt(item.qty * item.harga) : ""}
                        </td>
                      </tr>
                    ))}
                    <tr className="subtotal-row">
                      <td colSpan={6} style={{ textAlign: "center", fontWeight: "600" }}>Sub Total</td>
                      <td style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sub)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: "center", fontWeight: "600" }}>Total Sebelum Diskon</td>
                <td style={{ textAlign: "right", fontWeight: "600" }}>{fmt(grandTotal)}</td>
              </tr>
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  Diskon{(rab.diskon_persen ?? 0) > 0 ? ` (${rab.diskon_persen}%)` : ""}
                </td>
                <td style={{ textAlign: "right" }}>
                  {(rab.diskon_nilai ?? 0) > 0 ? `(${fmt(rab.diskon_nilai ?? 0)})` : fmt(0)}
                </td>
              </tr>
              <tr className="grand-total-row">
                <td colSpan={6} style={{ textAlign: "center", fontWeight: "bold", textTransform: "uppercase" }}>
                  Grand Total
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                  {fmt(grandTotal - (rab.diskon_nilai ?? 0))}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Termin */}
          <table className="termin-table">
            <thead>
              <tr>
                <td colSpan={2} style={{
                  textAlign: "center", fontWeight: "bold",
                  border: "1px solid #000", padding: "3px 6px",
                }}>
                  Pembagian Termin Pembayaran
                </td>
              </tr>
            </thead>
            <tbody>
              {termin.map((t) => (
                <tr key={t.label}>
                  <td style={{ border: "1px solid #000", padding: "3px 6px" }}>{t.label}</td>
                  <td style={{
                    border: "1px solid #000", padding: "3px 8px",
                    textAlign: "right", fontWeight: "600", whiteSpace: "nowrap", width: "88px",
                  }}>
                    {fmt(Math.round(netTotal * t.pct))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <KopFooter />
      </div>
    </div>
  );
}
