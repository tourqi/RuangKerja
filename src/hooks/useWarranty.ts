"use client";
import { useFetch } from "./useFetch";
import { getWarrantyFollowups } from "@/services/warranty";
import type { WarrantyFollowup } from "@/types/db";

export function useWarrantyFollowups() {
  const { data: followups, loading, error, refetch } = useFetch<WarrantyFollowup[]>(
    "warranty-followups",
    getWarrantyFollowups,
    []
  );
  return { followups, loading, error, refetch };
}
