"use client";
import { useCallback, useEffect, useState } from 'react';
import { getExpenses } from '@/services/expenses';
import type { ProjectExpense } from '@/types/db';

export function useExpenses(projectId: string | null) {
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    getExpenses(projectId)
      .then(setExpenses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { expenses, loading, refetch };
}
