"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type Position = { top?: number; bottom?: number; left: number; width: number };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Whether the dropdown offers a "clear back to unselected" row. Set false for required fields that always hold a real value. */
  includeEmptyOption?: boolean;
};

const DEFAULT_TRIGGER_CLASS =
  "w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none hover:border-gray-400 transition focus:ring-2 focus:ring-gray-900 disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50";

export function Select({ value, onChange, options, placeholder = "Pilih...", className, disabled, includeEmptyOption = true }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const computePosition = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const estimatedHeight = Math.min(options.length + 1, 8) * 36 + 16;
    const openUp = window.innerHeight - rect.bottom < estimatedHeight + 8 && rect.top > estimatedHeight;
    setPos({
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      left: rect.left,
      width: rect.width,
    });
  };

  const toggle = () => {
    if (disabled) return;
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

  function pick(v: string) {
    setOpen(false);
    onChange(v);
  }

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={className ?? DEFAULT_TRIGGER_CLASS}
      >
        <span className={`truncate ${selected ? "text-gray-900" : "text-gray-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
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
          role="listbox"
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-60 overflow-y-auto"
          style={pos}
        >
          {includeEmptyOption && (
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => pick("")}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 ${
                value === "" ? "text-gray-500 font-medium" : "text-gray-400"
              }`}
            >
              {placeholder}
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              disabled={opt.disabled}
              onClick={() => !opt.disabled && pick(opt.value)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                opt.disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : opt.value === value
                  ? "bg-gray-50 font-medium text-gray-900 hover:bg-gray-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
