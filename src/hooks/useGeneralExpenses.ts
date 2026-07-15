"use client";
import { useFetch } from "./useFetch";
import { getGeneralExpenses } from "@/services/generalExpenses";
import type { GeneralExpense } from "@/types/db";

export function useGeneralExpenses() {
  const { data: expenses, loading, error, refetch } = useFetch<GeneralExpense[]>(
    "general-expenses",
    getGeneralExpenses,
    []
  );
  return { expenses, loading, error, refetch };
}
