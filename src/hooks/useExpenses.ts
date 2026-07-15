"use client";
import { useCallback, useEffect, useState } from "react";
import { getAllExpenses, getExpenses } from "@/services/expenses";
import type { ProjectExpense } from "@/types/db";
import { useFetch } from "./useFetch";

export function useAllExpenses() {
  const { data: expenses, loading, error, refetch } = useFetch<ProjectExpense[]>("project-expenses", getAllExpenses, []);
  return { expenses, loading, error, refetch };
}

export function useExpenses(projectId: string | null) {
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    getExpenses(projectId)
      .then(setExpenses)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err))
      )
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { expenses, loading, error, refetch };
}
