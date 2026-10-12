"use client";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Card-based row layout used as the mobile (`<sm`) replacement for data
 * tables across the app — the desktop table stays as-is (wrapped in
 * `hidden sm:block`), this renders instead on narrow screens so users don't
 * have to horizontal-scroll a wide table on a phone.
 */

export function MobileCardList({ children }: { children: ReactNode }) {
  return <div className="sm:hidden space-y-3">{children}</div>;
}

export function MobileCard({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } } : undefined}
      className={`bg-white rounded-lg border border-line p-4 ${onClick ? "cursor-pointer active:bg-surface" : ""}`}
    >
      {children}
    </div>
  );
}

export function MobileCardHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3 mb-1 border-b border-line">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink truncate">{title}</p>
        {subtitle && <div className="mt-1">{subtitle}</div>}
      </div>
      {actions && (
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

/** Label kiri, value kanan — satu baris field dalam card, meniru pola "key: value" tabel aslinya. */
export function MobileCardRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-line last:border-0 text-sm">
      <span className="text-faint shrink-0">{label}</span>
      <span className="text-ink font-medium text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

type IconButtonProps = {
  onClick?: () => void;
  href?: string;
  title?: string;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export function MobileCardIconButton({ onClick, href, title, danger, disabled, children }: IconButtonProps) {
  const cls = `w-7 h-7 flex items-center justify-center rounded-md transition disabled:opacity-30 disabled:pointer-events-none ${
    danger ? "text-danger hover:bg-danger-soft" : "text-faint hover:bg-hover hover:text-ink"
  }`;
  if (href) {
    return (
      <Link href={href} title={title} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

const iconProps = { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" } as const;

export function EyeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

export function PencilIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

export function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
