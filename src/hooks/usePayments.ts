"use client";
import { useCallback, useEffect, useState } from "react";
import type { Payment } from "@/types/db";
import { getAllPayments, getPaymentsByInvoice } from "@/services/invoices";
import { useFetch } from "./useFetch";

export function useAllPayments() {
  const { data: payments, loading, error, refetch } = useFetch<Payment[]>("payments", getAllPayments, []);
  return { payments, loading, error, refetch };
}

export function usePayments(invoiceId: string | null) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    getPaymentsByInvoice(invoiceId)
      .then(setPayments)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err))
      )
      .finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { payments, loading, error, refetch };
}
