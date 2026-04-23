"use client";
import { useEffect } from "react";
import type { Invoice, Payment, Client } from "@/types/db";

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transfer Bank",
  cash: "Tunai",
  check: "Cek",
};

interface Props {
  invoice: Invoice;
  payments: Payment[];
  client?: Client;
}

export default function InvoicePrintView({ invoice, payments, client }: Props) {
  useEffect(() => {
    window.print();
  }, []);

  const outstanding = invoice.total_amount - invoice.paid_amount;
  const progressPct = invoice.total_amount > 0
    ? Math.min(100, Math.round((invoice.paid_amount / invoice.total_amount) * 100))
    : 0;

  return (
    <div className="print-invoice">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 15mm; }
          body * { visibility: hidden; }
          .print-invoice, .print-invoice * { visibility: visible; }
          .print-invoice { position: absolute; top: 0; left: 0; width: 100%; font-family: sans-serif; }
        }
        .print-invoice {
          font-family: sans-serif;
          font-size: 10pt;
          color: #111;
          max-width: 720px;
          margin: 0 auto;
          padding: 20px;
        }
        .print-invoice table { width: 100%; border-collapse: collapse; }
        .print-invoice th, .print-invoice td { border: 1px solid #ddd; padding: 6px 10px; font-size: 9pt; }
        .print-invoice th { background: #f3f4f6; text-align: left; font-weight: 600; }
        .print-invoice .no-border { border: none; }
        .print-invoice .text-right { text-align: right; }
        .print-invoice .summary-row td { border: none; padding: 4px 10px; }
        .print-invoice .summary-row.total td { border-top: 2px solid #111; font-weight: 700; font-size: 10pt; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "18pt", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" }}>INVOICE</h1>
          <p style={{ margin: "4px 0 0", fontSize: "11pt", fontWeight: "600", color: "#374151" }}>
            {invoice.invoice_number}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: "9pt", color: "#6b7280" }}>
          <p style={{ fontWeight: "700", fontSize: "12pt", color: "#111", margin: 0 }}>Interior ERP</p>
          <p style={{ margin: "2px 0" }}>RuangKerja</p>
          <p style={{ margin: "2px 0" }}>
            Tanggal: {invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
          </p>
          {invoice.due_date && (
            <p style={{ margin: "2px 0", color: outstanding > 0 ? "#dc2626" : "#16a34a" }}>
              Jatuh Tempo: {new Date(invoice.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Bill To */}
      <div style={{ marginBottom: "20px", padding: "12px 16px", background: "#f9fafb", borderRadius: "6px" }}>
        <p style={{ fontSize: "8pt", fontWeight: "600", textTransform: "uppercase", color: "#9ca3af", margin: "0 0 4px" }}>
          Tagihan Kepada
        </p>
        <p style={{ fontWeight: "700", fontSize: "11pt", margin: "0 0 2px" }}>{client?.name ?? "—"}</p>
        {client?.phone && <p style={{ margin: "0", color: "#6b7280", fontSize: "9pt" }}>{client.phone}</p>}
        {client?.address && <p style={{ margin: "0", color: "#6b7280", fontSize: "9pt" }}>{client.address}</p>}
      </div>

      {/* Invoice summary */}
      <table style={{ marginBottom: "20px" }}>
        <thead>
          <tr>
            <th>Keterangan</th>
            <th className="text-right" style={{ textAlign: "right" }}>Total Tagihan</th>
            <th className="text-right" style={{ textAlign: "right" }}>Terbayar</th>
            <th className="text-right" style={{ textAlign: "right" }}>Sisa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{invoice.notes || "Jasa Interior Design"}</td>
            <td className="text-right" style={{ textAlign: "right", fontWeight: "600" }}>{fmt(invoice.total_amount)}</td>
            <td className="text-right" style={{ textAlign: "right", color: "#16a34a" }}>{fmt(invoice.paid_amount)}</td>
            <td className="text-right" style={{ textAlign: "right", color: outstanding > 0 ? "#dc2626" : "#16a34a", fontWeight: "700" }}>
              {fmt(outstanding)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment history */}
      {payments.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "9pt", fontWeight: "700", textTransform: "uppercase", color: "#6b7280", marginBottom: "6px" }}>
            Riwayat Pembayaran
          </p>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Metode</th>
                <th>Catatan</th>
                <th className="text-right" style={{ textAlign: "right" }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.payment_date).toLocaleDateString("id-ID")}</td>
                  <td>{METHOD_LABELS[p.payment_method] ?? p.payment_method}</td>
                  <td style={{ color: "#6b7280" }}>{p.notes || "—"}</td>
                  <td className="text-right" style={{ textAlign: "right", color: "#16a34a", fontWeight: "600" }}>
                    {fmt(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <table style={{ width: "300px", marginLeft: "auto" }}>
        <tbody>
          <tr className="summary-row">
            <td>Total Tagihan</td>
            <td className="text-right" style={{ textAlign: "right" }}>{fmt(invoice.total_amount)}</td>
          </tr>
          <tr className="summary-row">
            <td>Total Pembayaran</td>
            <td className="text-right" style={{ textAlign: "right", color: "#16a34a" }}>{fmt(invoice.paid_amount)}</td>
          </tr>
          <tr className="summary-row total">
            <td>Sisa Tagihan</td>
            <td className="text-right" style={{ textAlign: "right", color: outstanding > 0 ? "#dc2626" : "#16a34a" }}>
              {fmt(outstanding)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Progress bar */}
      <div style={{ marginTop: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8pt", color: "#6b7280", marginBottom: "4px" }}>
          <span>Progress Pembayaran</span>
          <span>{progressPct}%</span>
        </div>
        <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            background: progressPct >= 100 ? "#16a34a" : "#3b82f6",
            borderRadius: "99px",
          }} />
        </div>
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: "8pt", color: "#9ca3af" }}>
          <p style={{ margin: 0 }}>Terima kasih atas kepercayaan Anda.</p>
          <p style={{ margin: "2px 0 0" }}>Dokumen ini dibuat secara otomatis oleh sistem.</p>
        </div>
        <div style={{
          padding: "4px 12px",
          borderRadius: "99px",
          fontSize: "9pt",
          fontWeight: "700",
          background: invoice.status === "paid" ? "#dcfce7" : invoice.status === "overdue" ? "#fee2e2" : "#f3f4f6",
          color: invoice.status === "paid" ? "#16a34a" : invoice.status === "overdue" ? "#dc2626" : "#374151",
        }}>
          {invoice.status === "paid" ? "LUNAS" : invoice.status === "overdue" ? "JATUH TEMPO" : invoice.status === "partial" ? "SEBAGIAN" : invoice.status === "sent" ? "TERKIRIM" : "DRAFT"}
        </div>
      </div>
    </div>
  );
}
