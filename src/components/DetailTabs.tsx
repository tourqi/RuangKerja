"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type DetailTab<K extends string> = { key: K; label: string; count?: number };

/**
 * Tab aktif untuk halaman detail, disimpan di URL (?tab=) supaya bisa
 * di-bookmark dan tetap sama setelah refresh / kembali dari halaman lain.
 */
export function useTabParam<K extends string>(keys: readonly K[], fallback: K): [K, (tab: K) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = useSearchParams().get("tab");
  const active = keys.includes(tabParam as K) ? (tabParam as K) : fallback;
  const setActive = (tab: K) => router.replace(`${pathname}?tab=${tab}`, { scroll: false });
  return [active, setActive];
}

export function DetailTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: DetailTab<K>[];
  active: K;
  onChange: (tab: K) => void;
}) {
  return (
    <div className="border-b border-line overflow-x-auto">
      <nav className="flex gap-5 min-w-max">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`py-2.5 text-[13px] border-b-2 -mb-px transition-colors whitespace-nowrap ${
              active === t.key
                ? "border-ink text-ink font-medium"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1.5 font-mono text-[11px] text-faint">{t.count}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
