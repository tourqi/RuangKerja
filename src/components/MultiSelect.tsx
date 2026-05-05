"use client";
import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  className?: string;
};

export function MultiSelect({ options, value, onChange, placeholder, className = "" }: Props) {
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none hover:border-gray-400 transition"
      >
        <span className={value.length === 0 ? "text-gray-500" : "text-gray-900 font-medium"}>
          {displayLabel}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value.length > 0 && (
            <span
              className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center hover:bg-gray-300 leading-none"
              onMouseDown={(e) => { e.stopPropagation(); onChange([]); }}
              title="Hapus filter"
            >
              ✕
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">Tidak ada pilihan</div>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-900 select-none"
            >
              <input
                type="checkbox"
                checked={value.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="w-4 h-4 rounded border-gray-300 accent-black"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
