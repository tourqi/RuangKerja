"use client";
import { useEffect, useState } from 'react';
import { getLeads } from '@/services/leads';
import { Lead } from '@/types/db';

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getLeads()
      .then(setLeads)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { leads, loading, error };
}
