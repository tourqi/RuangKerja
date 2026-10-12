"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

type ConfirmOptions = { title: string; description: string; confirmLabel?: string };
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/**
 * Dialog konfirmasi bersama untuk aksi yang tidak bisa dibatalkan.
 * Pakai: `const confirm = useConfirm(); if (!(await confirm({ title, description }))) return;`
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <DeleteConfirmModal
          title={opts.title}
          description={opts.description}
          confirmLabel={opts.confirmLabel}
          onConfirm={() => close(true)}
          onClose={() => close(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
