"use client";
import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  className?: string;
  id?: string;
};

export function MultiSelect({ options, value, onChange, placeholder, className = "", id }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const displayLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? (options.find((o) => o.value === value[0])?.label ?? value[0])
      : `${value.length} dipilih`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 border border-line rounded-md text-[13px] bg-white outline-none hover:border-faint transition"
      >
        <span className={value.length === 0 ? "text-muted" : "text-ink font-medium"}>
          {displayLabel}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value.length > 0 && (
            <span
              className="w-4 h-4 rounded-full bg-line text-muted text-[10px] flex items-center justify-center hover:bg-accent-hover leading-none"
              onMouseDown={(e) => { e.stopPropagation(); onChange([]); }}
              title="Hapus filter"
            >
              ✕
            </span>
          )}
          <svg
            className={`w-4 h-4 text-faint transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-line rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-faint">Tidak ada pilihan</div>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-hover cursor-pointer text-[13px] text-ink select-none"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-4 h-4 rounded border-line-strong accent-[#3247d1]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
