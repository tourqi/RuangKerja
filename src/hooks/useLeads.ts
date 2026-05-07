"use client";
import { getLeads } from "@/services/leads";
import { Lead } from "@/types/db";
import { useFetch } from "./useFetch";

export function useLeads() {
  const { data: leads, loading, error, refetch } = useFetch<Lead[]>(getLeads, []);
  return { leads, loading, error, refetch };
}
