"use client";
import { useGeneralExpenses } from "@/hooks/useGeneralExpenses";
import { useAllExpenses } from "@/hooks/useExpenses";
import { useAllPayments } from "@/hooks/usePayments";
import { useInvoices } from "@/hooks/useInvoices";
import { useProjects } from "@/hooks/useProjects";
import { useClients } from "@/hooks/useClients";
import { LaporanKeuangan } from "./LaporanKeuangan";

export default function LaporanKeuanganPage() {
  const { expenses: generalExpenses } = useGeneralExpenses();
  const { expenses: projectExpenses } = useAllExpenses();
  const { payments } = useAllPayments();
  const { invoices } = useInvoices();
  const { projects } = useProjects();
  const { clients } = useClients();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Laporan Keuangan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Laporan terintegrasi: pemasukan dari invoice, biaya project, dan pengeluaran umum
        </p>
      </div>
      <LaporanKeuangan
        payments={payments ?? []}
        projectExpenses={projectExpenses ?? []}
        generalExpenses={generalExpenses ?? []}
        invoices={invoices ?? []}
        projects={projects ?? []}
        clients={clients ?? []}
      />
    </div>
  );
}
