"use client";
import { useCallback, useEffect, useState } from 'react';
import { getAllExpenses, getExpenses } from '@/services/expenses';
import type { ProjectExpense } from '@/types/db';

export function useAllExpenses() {
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    getAllExpenses()
      .then(setExpenses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { expenses, loading, refetch };
}

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
