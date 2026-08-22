"use client";
import { useCallback, useEffect, useState } from "react";
import { getLeadContacts } from "@/services/leadContacts";
import { LeadContact } from "@/types/db";

export function useLeadContacts(leadId: string | null) {
  const [contacts, setContacts] = useState<LeadContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    getLeadContacts(leadId)
      .then(setContacts)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { contacts, loading, error, refetch };
}
