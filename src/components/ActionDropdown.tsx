"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  danger?: boolean;
  disabled?: boolean;
};

type Position = { top?: number; bottom?: number; left?: number; right?: number };

type Props = {
  items: ActionMenuItem[];
  /** Which edge of the button the menu hangs from. Defaults to "right" since Aksi is usually the last column. */
  align?: "left" | "right";
  label?: string;
  buttonClassName?: string;
};

export function ActionDropdown({ items, align = "right", label = "Pilih Aksi", buttonClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const estimatedHeight = items.length * 36 + 16;
    const openUp = window.innerHeight - rect.bottom < estimatedHeight + 8 && rect.top > estimatedHeight;

    const next: Position = openUp
      ? { bottom: window.innerHeight - rect.top + 4 }
      : { top: rect.bottom + 4 };

    if (align === "right") {
      next.right = window.innerWidth - rect.right;
    } else {
      next.left = rect.left;
    }
    setPos(next);
  };

  const toggle = () => {
    if (!open) computePosition();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleReposition() {
      computePosition();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          buttonClassName ??
          "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
        }
      >
        {label}
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-[190px] bg-white border border-gray-200 rounded-lg shadow-lg py-1"
          style={pos}
        >
          {items.map((item) => {
            const inner = (
              <>
                <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </>
            );
            const className = `w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
              item.disabled
                ? "opacity-40 cursor-not-allowed text-gray-400"
                : item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-gray-700 hover:bg-gray-50"
            }`;

            if (item.href && !item.disabled) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  target={item.target}
                  className={className}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={className}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {inner}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
