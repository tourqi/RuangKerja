"use client";
import React, { useEffect } from "react";
import { Rab } from "@/types/db";

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
const NAVY   = "#1a2560";
const GOLD   = "#c8a84b";
const EMAIL  = "peshasuryaconstruction@gmail.com";
const ADDR1  = "Lingkungan 02 citatah Dalam, Rt 04/Rw 04 (No 83),";
const ADDR2  = "Kab. Bogor, Cibinong, Jawa Barat, ID, 16918";

/* ─── Default payment terms (fallback if no skema set) ─ */
const DEFAULT_TERMIN = [
  { label: "Progres 0% sd 30% : Dibayar DP 30%",                                                      pct: 0.3  },
  { label: "Progres Pekerjaan 31% sd 60% dan Pemasangan 50%: Dibayar 30%",                            pct: 0.3  },
  { label: "Progres Pekerjaan 76% sd 90% & Pemasangan 70%: Dibayar 30%",                              pct: 0.3  },
  { label: "Progress Pekerjaan dan Pemasangan 100% dan BAST Sudah Ditandatangan: Dibayar 10%",        pct: 0.1  },
];

/* ─── Logo SVG (approximate PT PESHA SURYA badge) ──── */
function LogoBadge() {
  return (
    <svg viewBox="0 0 110 110" width="72" height="72" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="55" cy="55" r="53" fill={NAVY} />
      <circle cx="55" cy="55" r="53" fill="none" stroke={GOLD} strokeWidth="3" />
      {/* Inner thin ring */}
      <circle cx="55" cy="55" r="46" fill="none" stroke={GOLD} strokeWidth="1" />

      {/* Roof / pediment triangle */}
      <polygon points="55,16 85,38 25,38" fill={GOLD} />
      {/* Horizontal frieze below roof */}
      <rect x="23" y="37" width="64" height="5" fill={GOLD} />

      {/* Building body */}
      <rect x="23" y="42" width="64" height="42" fill={GOLD} />

      {/* 2×3 window grid (navy boxes on gold body) */}
      <rect x="30" y="47" width="14" height="11" fill={NAVY} rx="1" />
      <rect x="48" y="47" width="14" height="11" fill={NAVY} rx="1" />
      <rect x="66" y="47" width="14" height="11" fill={NAVY} rx="1" />
      <rect x="30" y="61" width="14" height="11" fill={NAVY} rx="1" />
      <rect x="66" y="61" width="14" height="11" fill={NAVY} rx="1" />

      {/* Centre door / arch */}
      <rect x="46" y="61" width="18" height="23" fill={NAVY} rx="1" />
      <path d="M46,63 Q55,55 64,63" fill={NAVY} />
    </svg>
  );
}

/* ─── Kop header (shared between pages) ─────────────── */
function KopHeader() {
  return (
    <div style={{ position: "relative", width: "100%", height: "36mm", overflow: "hidden" }}>

      {/* Navy right block — parallelogram via clip-path */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: "26mm",
        background: NAVY,
        clipPath: "polygon(34% 0%, 100% 0%, 100% 100%, 28% 100%)",
      }} />

      {/* Gold bar below the navy block */}
      <div style={{
        position: "absolute", top: "26mm", left: 0, right: 0,
        height: "10mm",
        background: GOLD,
        clipPath: "polygon(31% 0%, 100% 0%, 100% 100%, 25% 100%)",
      }} />

      {/* Tagline text inside the navy block */}
      <div style={{
        position: "absolute", top: 0, right: "8mm",
        height: "26mm",
        display: "flex", alignItems: "center",
        textAlign: "right",
        color: "#ffffff",
        fontSize: "7.5pt",
        fontWeight: "700",
        lineHeight: 1.6,
        letterSpacing: "0.3px",
        fontFamily: "Arial, sans-serif",
      }}>
        INTERIOR, EKSTERIOR, KONTRAKTOR BANGUNAN,<br />
        ALUMUNIUM, BAJA RINGAN, GLASS ART,DLL
      </div>

      {/* Logo + company name — sits on the white left area */}
      <div style={{
        position: "absolute", top: "4mm", left: "12mm",
        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px",
      }}>
        <LogoBadge />
        <div style={{
          fontFamily: "Arial, sans-serif",
          fontWeight: "900",
          fontSize: "11pt",
          color: NAVY,
          letterSpacing: "0.5px",
          lineHeight: 1.1,
          marginTop: "2px",
        }}>
          PT PESHA SURYA
        </div>
        <div style={{
          fontFamily: "Arial, sans-serif",
          fontWeight: "700",
          fontSize: "6.5pt",
          color: GOLD,
          letterSpacing: "3px",
        }}>
          CONSTRUCTION
        </div>
      </div>
    </div>
  );
}

/* ─── Kop footer (shared between pages) ─────────────── */
function KopFooter() {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: "20mm",
      overflow: "hidden",
    }}>
      {/* Navy wedge at bottom-left */}
      <div style={{
        position: "absolute", bottom: 0, left: 0,
        width: "38mm", height: "14mm",
        background: NAVY,
        clipPath: "polygon(0% 100%, 0% 40%, 100% 100%)",
      }} />

      {/* Gold bar at bottom-right */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "8mm",
        background: GOLD,
        clipPath: "polygon(60% 0%, 100% 0%, 100% 100%, 55% 100%)",
      }} />

      {/* Contact info */}
      <div style={{
        position: "absolute", bottom: "9mm", left: "14mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "7.5pt",
        color: "#222",
        lineHeight: 1.6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {/* Email icon */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7.5" fill="#e05a2b" />
            <rect x="3" y="5" width="10" height="7" rx="1" fill="none" stroke="#fff" strokeWidth="1" />
            <path d="M3 6l5 3.5L13 6" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span>{EMAIL}</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "5px", marginTop: "1px" }}>
          {/* Location icon */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
            <circle cx="8" cy="8" r="7.5" fill="#e05a2b" />
            <path d="M8 4C6.34 4 5 5.34 5 7c0 2.5 3 5 3 5s3-2.5 3-5c0-1.66-1.34-3-3-3z" fill="#fff" />
            <circle cx="8" cy="7" r="1.2" fill="#e05a2b" />
          </svg>
          <span>{ADDR1}<br />{ADDR2}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */
export default function SphPrintView({ rab, groups, config, onClose }: Props) {
  useEffect(() => {
    const handleAfterPrint = () => onClose();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [onClose]);

  const groupSubtotal = (g: PrintGroup) =>
    g.items.reduce((s, i) => s + i.qty * i.harga, 0);
  const grandTotal = groups.reduce((s, g) => s + groupSubtotal(g), 0);

  const termin = (rab.skema_pembayaran ?? []).length > 0
    ? rab.skema_pembayaran!.map((s) => ({ label: s.keterangan, pct: s.persen / 100 }))
    : DEFAULT_TERMIN;

  const now   = new Date();
  const nomorSph = config.nomorSph ||
    `001/SPH/${ROMAN_MONTHS[now.getMonth()]}/${now.getFullYear()}`;

  /* Thin separator line that appears between kop and body */
  const Separator = () => (
    <div style={{ borderBottom: `1.5px solid ${NAVY}`, marginBottom: "6mm" }} />
  );

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
          .sph-body { padding: 2mm 18mm 22mm; font-family: 'Times New Roman', serif; font-size: 10pt; }
          .rab-table { border-collapse: collapse; width: 100%; font-size: 8pt; }
          .rab-table th, .rab-table td { border: 1px solid #000; padding: 2.5px 4px; vertical-align: middle; }
          .rab-table th { text-align: center; font-weight: bold; }
          .subtotal-row td { background: #f8f8f8; }
          .grand-total-row td { background: #f0f0f0; font-weight: bold; }
          .termin-table { border-collapse: collapse; width: 100%; font-size: 8pt; margin-top: 10px; }
          .termin-table td { border: 1px solid #000; padding: 3px 6px; }
        }
        .sph-print { font-family: 'Times New Roman', serif; font-size: 10pt; color: #000; }
        .sph-page { position: relative; width: 210mm; min-height: 297mm; box-sizing: border-box; overflow: hidden; }
        .sph-body { padding: 2mm 18mm 22mm; }
      `}</style>

      {/* ════════════════════════════════════════
          PAGE 1 — SURAT PENAWARAN HARGA
      ════════════════════════════════════════ */}
      <div className="sph-page">
        <KopHeader />

        <div className="sph-body">
          <Separator />

          {/* Nomor / Lampiran / Hal */}
          <div style={{ marginBottom: "5mm", fontSize: "10pt", fontFamily: "'Times New Roman', serif" }}>
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
            <div>{config.greeting} {config.clientName}</div>
            <div>Di Tempat</div>
          </div>

          {/* Salutation */}
          <div style={{ marginBottom: "3mm", fontSize: "10pt" }}>Dengan hormat,</div>

          {/* Body text */}
          <div style={{ fontSize: "10pt", textAlign: "justify", lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 3.5mm" }}>
              Sehubungan dengan rencana pekerjaan penataan Interior Full House, bersama ini kami
              sampaikan Rencana Anggaran Biaya (RAB) sebagai bahan pertimbangan dan acuan. Dokumen
              RAB tersebut telah kami susun berdasarkan spesifikasi pekerjaan, kebutuhan material,
              dan ketentuan yang telah dibicarakan sebelumnya.
            </p>
            <p style={{ margin: "0 0 3.5mm" }}>
              Kami berharap rincian yang kami sampaikan ini dapat membantu {config.greeting}{" "}
              {config.clientName.split(" ")[0]} dalam menentukan pilihan terbaik sesuai kebutuhan
              dan anggaran yang tersedia. Apabila diperlukan, kami siap memberikan penjelasan lebih
              detail atau melakukan penyesuaian sesuai masukan dari {config.greeting}.
            </p>
            <p style={{ margin: 0 }}>
              Demikian surat penawaran ini kami sampaikan. Atas perhatian, waktu, dan kerja sama
              yang baik dari {config.greeting}, kami ucapkan terima kasih.
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

          <div style={{ fontSize: "8.5pt", marginBottom: "3mm", fontFamily: "'Times New Roman', serif" }}>
            Lampiran I
          </div>

          <div style={{
            textAlign: "center", fontWeight: "bold",
            fontSize: "9.5pt", marginBottom: "4mm",
            textTransform: "uppercase",
            fontFamily: "'Times New Roman', serif",
          }}>
            <div>Rencana Anggaran Biaya</div>
            <div>Pekerjaan Interior {rab.nama}</div>
          </div>

          <table className="rab-table">
            <thead>
              <tr>
                <th style={{ width: "22px" }} rowSpan={2}>NO</th>
                <th style={{ width: "90px" }} rowSpan={2}>DESKRIPSI</th>
                <th colSpan={2}>DIMENSI</th>
                <th rowSpan={2}>SPESIFIKASI</th>
                <th style={{ width: "34px" }} rowSpan={2}>QTY</th>
                <th style={{ width: "26px" }} rowSpan={2}>SAT</th>
                <th style={{ width: "68px" }} rowSpan={2}>HARGA</th>
                <th style={{ width: "76px" }} rowSpan={2}>TOTAL</th>
              </tr>
              <tr>
                <th style={{ width: "28px" }}>P</th>
                <th style={{ width: "28px" }}>L</th>
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
                            <td style={{ textAlign: "center", verticalAlign: "top" }} rowSpan={group.items.length || 1}>
                              {group.no}
                            </td>
                            <td style={{ verticalAlign: "top", fontWeight: "600", fontSize: "7.5pt" }} rowSpan={group.items.length || 1}>
                              {group.deskripsi}
                            </td>
                          </>
                        )}
                        <td style={{ textAlign: "center", fontSize: "7.5pt" }}>
                          {item.dimensi_p != null && item.dimensi_p > 0
                            ? item.dimensi_p.toLocaleString("id-ID", { maximumFractionDigits: 2 })
                            : ""}
                        </td>
                        <td style={{ textAlign: "center", fontSize: "7.5pt" }}>
                          {item.dimensi_l != null && item.dimensi_l > 0
                            ? item.dimensi_l.toLocaleString("id-ID", { maximumFractionDigits: 2 })
                            : ""}
                        </td>
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
                      <td colSpan={8} style={{ textAlign: "center", fontWeight: "600" }}>Sub Total</td>
                      <td style={{ textAlign: "right", fontWeight: "600" }}>{fmt(sub)}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="grand-total-row">
                <td colSpan={8} style={{ textAlign: "center", fontWeight: "bold", textTransform: "uppercase" }}>
                  Grand Total
                </td>
                <td style={{ textAlign: "right", fontWeight: "bold" }}>{fmt(grandTotal)}</td>
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
                    {fmt(Math.round(grandTotal * t.pct))}
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
