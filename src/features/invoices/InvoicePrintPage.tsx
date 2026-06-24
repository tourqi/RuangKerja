"use client";
import { useState } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useClients } from "@/hooks/useClients";
import { useAllRabs, useRabDetail } from "@/hooks/useRab";
import InvoicePrintView from "./InvoicePrintView";
import { generateInvoiceDocx } from "./generateInvoiceDocx";
import Link from "next/link";

export default function InvoicePrintPage({ invoiceId }: { invoiceId: string }) {
  const { invoices, loading: li } = useInvoices();
  const { payments, loading: lp } = usePayments(invoiceId);
  const { clients } = useClients();
  const { rabs } = useAllRabs();

  const invoice = invoices.find((i) => i.id === invoiceId);
  const client  = clients.find((c) => c.id === invoice?.client_id);
  const rab     = rabs.find((r) => r.id === invoice?.rab_id);

  const { groups, loading: lg } = useRabDetail(invoice?.rab_id ?? null);

  const [downloading, setDownloading] = useState(false);

  async function handleDownloadWord() {
    if (!invoice) return;
    setDownloading(true);
    try {
      await generateInvoiceDocx(invoice, client, rab, groups);
    } finally {
      setDownloading(false);
    }
  }

  if (li || lp || lg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Invoice tidak ditemukan.{" "}
        <Link href="/invoices" className="ml-1 underline text-gray-700">Kembali</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="print:hidden flex items-center gap-2">
        <Link
          href={`/invoices/${invoiceId}`}
          className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Kembali
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Cetak / Simpan PDF
        </button>
        <button
          onClick={handleDownloadWord}
          disabled={downloading}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {downloading ? "Menyiapkan…" : "↓ Download Word"}
        </button>
      </div>

      <InvoicePrintView invoice={invoice} payments={payments} client={client} rab={rab} groups={groups} />
    </div>
  );
}
