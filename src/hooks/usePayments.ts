"use client";
import { useCallback, useEffect, useState } from 'react';
import type { Payment } from '@/types/db';
import { getPaymentsByInvoice } from '@/services/invoices';

export function usePayments(invoiceId: string | null) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!invoiceId) return;
    setLoading(true);
    getPaymentsByInvoice(invoiceId)
      .then(setPayments)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { payments, loading, error, refetch };
}
