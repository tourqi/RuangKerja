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
    <div className="border-b border-gray-200 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${
              active === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">{t.count}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
