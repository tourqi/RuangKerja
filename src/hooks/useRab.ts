"use client";
import { useEffect, useState, useCallback } from 'react';
import { getRabByLead, getRabWithGroups } from '@/services/rab';
import { Rab, RabGroup } from '@/types/db';

export function useRabList(leadId: string) {
  const [rabList, setRabList] = useState<Rab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!leadId) return;
    try {
      const data = await getRabByLead(leadId);
      setRabList(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  }, [leadId]);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await refetch();
    setLoading(false);
  }, [refetch]);

  useEffect(() => { initialLoad(); }, [initialLoad]);

  return { rabList, loading, error, refetch };
}

export function useRabDetail(rabId: string | null) {
  const [groups, setGroups] = useState<RabGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!rabId) return;
    setLoading(true);
    getRabWithGroups(rabId)
      .then(setGroups)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [rabId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { groups, loading, error, refetch };
}
