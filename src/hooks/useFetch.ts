"use client";
import useSWR from "swr";

/**
 * Generic data-fetch hook backed by SWR's shared cache. Components that call
 * this with the same `key` (e.g. TopBar and a page both requesting "clients")
 * dedupe into a single request and share the cached result, instead of each
 * firing its own independent fetch.
 */
export function useFetch<T>(key: string, fetcher: () => Promise<T>, initialData: T) {
  const { data, error, isLoading, mutate } = useSWR<T>(key, fetcher);

  return {
    data: data ?? initialData,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : String(error)) : null,
    refetch: () => mutate(),
  };
}
