"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { SWRConfig, mutate } from "swr";

/**
 * Penanganan error data global. Setiap fetch SWR yang gagal dicatat oleh
 * DataErrorProvider, lalu DataErrorBanner menampilkannya di atas konten halaman,
 * supaya data yang gagal dimuat tidak terlihat seperti "belum ada data".
 * Tombol "Coba lagi" memuat ulang semua key yang gagal.
 */
type Failed = Record<string, string>;
const DataErrorContext = createContext<Failed>({});

const messageOf = (err: unknown) =>
  err instanceof Error ? err.message
    : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message)
    : String(err);

export function DataErrorProvider({ children }: { children: ReactNode }) {
  const [failed, setFailed] = useState<Failed>({});
  const onError = useCallback((err: unknown, key: string) => {
    setFailed((prev) => ({ ...prev, [key]: messageOf(err) }));
  }, []);
  const onSuccess = useCallback((_: unknown, key: string) => {
    setFailed((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  return (
    <SWRConfig value={{ onError, onSuccess }}>
      <DataErrorContext.Provider value={failed}>{children}</DataErrorContext.Provider>
    </SWRConfig>
  );
}

export function DataErrorBanner() {
  const failed = useContext(DataErrorContext);
  const [retrying, setRetrying] = useState(false);
  const keys = Object.keys(failed);
  if (keys.length === 0) return null;

  async function retry() {
    setRetrying(true);
    await Promise.allSettled(keys.map((k) => mutate(k)));
    setRetrying(false);
  }

  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-md border border-danger-line bg-danger-soft text-[13px] text-ink">
      <span className="inline-flex items-center gap-2 min-w-0">
        <span className="w-[7px] h-[7px] rounded-full bg-danger shrink-0" />
        <span>
          Sebagian data gagal dimuat, jadi angka di halaman ini bisa belum lengkap.
          <span className="text-muted hidden md:inline"> ({failed[keys[0]]})</span>
        </span>
      </span>
      <button
        onClick={retry}
        disabled={retrying}
        className="px-2.5 py-1 text-xs font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors disabled:opacity-50"
      >
        {retrying ? "Memuat ulang..." : "Coba lagi"}
      </button>
    </div>
  );
}
