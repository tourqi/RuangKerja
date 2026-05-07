"use client";
import type { Invoice } from "@/types/db";
import { getInvoices } from "@/services/invoices";
import { useFetch } from "./useFetch";

export function useInvoices() {
  const { data: invoices, loading, error, refetch } = useFetch<Invoice[]>(getInvoices, []);
  return { invoices, loading, error, refetch };
}
