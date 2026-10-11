"use client";
import React, { useEffect } from "react";
import type { Invoice, Payment, Client, Rab, RabGroup } from "@/types/db";

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

interface Props {
  invoice: Invoice;
  payments: Payment[];
  client?: Client;
  rab?: Rab;
  groups: RabGroup[];
}

export default function InvoicePrintView({ invoice, client, rab, groups }: Props) {
  useEffect(() => {
    // auto-print hanya jika langsung dibuka via URL /print
    // tidak dipanggil saat preview
  }, []);

  const groupSubtotal = (g: RabGroup) =>
    (g.items ?? []).reduce((s, i) => s + i.qty * i.harga, 0);
  const grandTotal   = groups.length > 0
    ? groups.reduce((s, g) => s + groupSubtotal(g), 0)
    : invoice.total_amount + (invoice.diskon_nilai ?? 0);
  const diskonNilai  = invoice.diskon_nilai  ?? rab?.diskon_nilai  ?? 0;
  const diskonPersen = invoice.diskon_persen ?? rab?.diskon_persen ?? 0;
  const netTotal     = grandTotal - diskonNilai;
  const dateStr      = invoice.invoice_date ?? invoice.created_at;

  const NAVY = "#1a2560";

  return (
    <div className="inv-wrap">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body * { visibility: hidden; }
          .inv-wrap, .inv-wrap * { visibility: visible; }
          .inv-wrap { position: fixed; top: 0; left: 0; width: 100%; background: #fff; }
          .inv-page {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
            overflow: hidden;
          }
          .inv-body { padding: 4mm 18mm 28mm; font-family: 'Cambria', 'Times New Roman', serif; font-size: 10pt; }
          .rab-table { border-collapse: collapse; width: 100%; font-size: 8pt; table-layout: fixed; }
          .rab-table th, .rab-table td { border: 1px solid #000; padding: 2.5px 4px; vertical-align: middle; }
          .rab-table th { text-align: center; font-weight: bold; background: #e8e8e8; }
          .sub-row td { background: #f8f8f8; font-weight: 600; }
          .total-row td { font-weight: 600; }
          .grand-row td { background: #e8e8e8; font-weight: bold; }
          .tagihan-table { border-collapse: collapse; width: 100%; font-size: 8pt; }
          .tagihan-table th, .tagihan-table td { border: 1px solid #000; padding: 3px 6px; }
          .tagihan-table th { background: #e8e8e8; text-align: center; font-weight: bold; }
          .sign-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          .sign-table td { border: none; padding: 2px 0; vertical-align: top; }
        }

        .inv-wrap {
          font-family: 'Cambria', 'Times New Roman', serif;
          color: #000;
        }
        .inv-page {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          box-sizing: border-box;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 2px 16px rgba(0,0,0,0.10);
        }
        .inv-body { padding: 4mm 18mm 28mm; font-size: 10pt; }
        .rab-table { border-collapse: collapse; width: 100%; font-size: 8pt; table-layout: fixed; }
        .rab-table th, .rab-table td { border: 1px solid #000; padding: 2.5px 4px; vertical-align: middle; }
        .rab-table th { text-align: center; font-weight: bold; background: #e8e8e8; }
        .sub-row td { background: #f8f8f8; font-weight: 600; }
        .total-row td { font-weight: 600; }
        .grand-row td { background: #e8e8e8; font-weight: bold; }
        .tagihan-table { border-collapse: collapse; width: 100%; font-size: 8pt; }
        .tagihan-table th, .tagihan-table td { border: 1px solid #000; padding: 3px 6px; }
        .tagihan-table th { background: #e8e8e8; text-align: center; font-weight: bold; }
        .sign-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
        .sign-table td { border: none; padding: 2px 0; vertical-align: top; }
      `}</style>

      <div className="inv-page">
        {/* Kop surat header */}
        <div style={{ width: "100%", lineHeight: 0 }}>
          <img src="/header.png" alt="" style={{ width: "100%", display: "block" }} />
        </div>

        <div className="inv-body">
          {/* Judul */}
          <div style={{ textAlign: "center", marginBottom: "4mm" }}>
            <div style={{ fontSize: "14pt", fontWeight: "bold", textDecoration: "underline", letterSpacing: "1px" }}>
              INVOICE
            </div>
            <div style={{ fontSize: "10pt", fontWeight: "bold" }}>
              Nomor: {invoice.invoice_number}
            </div>
          </div>

          {/* Tagihan Untuk */}
          <div style={{ marginBottom: "4mm", fontSize: "9.5pt" }}>
            <div>Tagihan Untuk</div>
            <div style={{ fontWeight: "bold", color: NAVY }}>{client?.name ?? "—"}</div>
            {client?.address && (
              <>
                <div>Alamat:</div>
                <div>{client.address}</div>
              </>
            )}
            {(rab?.nama || invoice.notes) && (
              <>
                <div style={{ marginTop: "2px" }}>Jenis Pekerjaan:</div>
                <div>{rab?.nama ?? invoice.notes}</div>
              </>
            )}
          </div>

          {/* RAB Table */}
          {groups.length > 0 ? (
            <table className="rab-table">
              <colgroup>
                <col style={{ width: "22px" }} />
                <col style={{ width: "78px" }} />
                <col />
                <col style={{ width: "34px" }} />
                <col style={{ width: "24px" }} />
                <col style={{ width: "66px" }} />
                <col style={{ width: "72px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>NO</th>
                  <th>PEKERJAAN</th>
                  <th>DESKRIPSI</th>
                  <th>QTY</th>
                  <th>SAT</th>
                  <th>HARGA</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const sub   = groupSubtotal(group);
                  const items = group.items ?? [];
                  return (
                    <React.Fragment key={group.id}>
                      {items.map((item, idx) => (
                        <tr key={item.id}>
                          {idx === 0 && (
                            <>
                              <td style={{ textAlign: "center", verticalAlign: "top" }} rowSpan={items.length || 1}>
                                {group.no}
                              </td>
                              <td style={{ verticalAlign: "top", fontWeight: 600 }} rowSpan={items.length || 1}>
                                {group.deskripsi}
                              </td>
                            </>
                          )}
                          <td>{item.spesifikasi}</td>
                          <td style={{ textAlign: "right" }}>
                            {item.qty > 0 ? item.qty.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                          </td>
                          <td style={{ textAlign: "center" }}>{item.unit}</td>
                          <td style={{ textAlign: "right" }}>{item.harga > 0 ? fmt(item.harga) : ""}</td>
                          <td style={{ textAlign: "right" }}>
                            {item.qty > 0 && item.harga > 0 ? fmt(item.qty * item.harga) : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="sub-row">
                        <td colSpan={6} style={{ textAlign: "center" }}>Sub Total</td>
                        <td style={{ textAlign: "right" }}>{fmt(sub)}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td colSpan={6} style={{ textAlign: "center" }}>Total Sebelum Diskon</td>
                  <td style={{ textAlign: "right" }}>{fmt(grandTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    Diskon{diskonPersen > 0 ? ` (${Math.round(diskonPersen)}%)` : ""}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {diskonNilai > 0 ? `(${fmt(diskonNilai)})` : fmt(0)}
                  </td>
                </tr>
                <tr className="grand-row">
                  <td colSpan={6} style={{ textAlign: "center" }}>GRAND TOTAL</td>
                  <td style={{ textAlign: "right" }}>{fmt(netTotal)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="rab-table" style={{ marginBottom: "3mm" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Keterangan</th>
                  <th style={{ width: "90px" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{invoice.notes ?? "Jasa Pekerjaan"}</td>
                  <td style={{ textAlign: "right" }}>{fmt(invoice.total_amount)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="grand-row">
                  <td style={{ textAlign: "center" }}>GRAND TOTAL</td>
                  <td style={{ textAlign: "right" }}>{fmt(invoice.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* Tagihan Saat Ini */}
          <div style={{ marginTop: "4mm" }}>
            <table className="tagihan-table">
              <thead>
                <tr>
                  <th colSpan={2}>Tagihan Saat Ini</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{invoice.notes ?? "Termin Pembayaran"}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, whiteSpace: "nowrap", width: "90px" }}>
                    {fmt(invoice.total_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Keterangan + Tanda Tangan */}
          <div style={{ marginTop: "8mm" }}>
            <table className="sign-table">
              <tbody>
                <tr>
                  <td style={{ width: "55%" }}>
                    <div style={{ fontWeight: "bold", fontSize: "9pt" }}>Keterangan:</div>
                    <div style={{ fontSize: "9pt" }}>Pembayaran dapat dilakukan ke:</div>
                    <div style={{ fontWeight: "bold", fontSize: "9pt" }}>BCA 6830659003 A.n Lutfi Wisda H.P</div>
                    <div style={{ fontSize: "9pt" }}>Mohon konfirmasi apabila telah melakukan pembayaran.</div>
                  </td>
                  <td style={{ textAlign: "center", width: "45%" }}>
                    <div style={{ fontSize: "9pt" }}>Hormat Kami, Bogor, {fmtDateLong(dateStr)}</div>
                    <div style={{ height: "18mm" }} />
                    <div style={{ fontWeight: "bold", fontSize: "9pt" }}>Muhamad Tourqi S.F</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Kop surat footer */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, lineHeight: 0 }}>
          <img src="/footer.png" alt="" style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
