"use client";
import { useInvoices } from "@/hooks/useInvoices";
import { usePayments } from "@/hooks/usePayments";
import { useClients } from "@/hooks/useClients";
import InvoicePrintView from "./InvoicePrintView";
import Link from "next/link";

export default function InvoicePrintPage({ invoiceId }: { invoiceId: string }) {
  const { invoices, loading: li } = useInvoices();
  const { payments, loading: lp } = usePayments(invoiceId);
  const { clients } = useClients();

  const invoice = invoices.find((i) => i.id === invoiceId);
  const client = clients.find((c) => c.id === invoice?.client_id);

  if (li || lp) {
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
    <>
      {/* Screen-only back button */}
      <div className="print:hidden fixed top-4 left-4 flex gap-2 z-50">
        <Link
          href={`/invoices/${invoiceId}`}
          className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          ← Kembali
        </Link>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
        >
          Cetak / Simpan PDF
        </button>
      </div>
      <InvoicePrintView invoice={invoice} payments={payments} client={client} />
    </>
  );
}
