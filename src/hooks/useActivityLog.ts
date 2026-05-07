"use client";
import { useCallback, useEffect, useState } from "react";
import { getActivityLogs, type ActivityLog } from "@/services/activityLog";

export function useActivityLog(
  entityType: ActivityLog["entity_type"],
  entityId: string | null
) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    getActivityLogs(entityType, entityId)
      .then(setLogs)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err))
      )
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { logs, loading, error, refetch };
}
