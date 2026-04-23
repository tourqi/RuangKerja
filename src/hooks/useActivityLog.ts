"use client";
import { useCallback, useEffect, useState } from 'react';
import { getActivityLogs, type ActivityLog } from '@/services/activityLog';

export function useActivityLog(
  entityType: ActivityLog['entity_type'],
  entityId: string | null
) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    getActivityLogs(entityType, entityId)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { logs, loading, refetch };
}
