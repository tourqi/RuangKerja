"use client";
import { useGeneralExpenses } from "@/hooks/useGeneralExpenses";
import { PengeluaranUmumTable } from "./PengeluaranUmumTable";

export default function PengeluaranUmumPage() {
  const { expenses, loading, refetch } = useGeneralExpenses();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pengeluaran Umum</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Catat biaya operasional kantor, marketing, gaji, dan pengeluaran non-project lainnya
        </p>
      </div>
      <PengeluaranUmumTable
        expenses={expenses ?? []}
        loading={loading}
        onRefresh={refetch}
      />
    </div>
  );
}
