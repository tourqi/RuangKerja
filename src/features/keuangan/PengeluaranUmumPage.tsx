"use client";
import { useGeneralExpenses } from "@/hooks/useGeneralExpenses";
import { PengeluaranUmumTable } from "./PengeluaranUmumTable";

export default function PengeluaranUmumPage() {
  const { expenses, loading, refetch } = useGeneralExpenses();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Pengeluaran Umum</h1>
        <p className="text-sm text-muted mt-0.5">
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
