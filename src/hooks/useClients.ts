"use client";
import { useEffect, useState } from 'react';
import { getClients } from '@/services/clients';
import { Client } from '@/types/db';

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getClients()
      .then(setClients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { clients, loading, error };
}
