import InvoicePrintPage from "@/features/invoices/InvoicePrintPage";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoicePrintPage invoiceId={id} />;
}
