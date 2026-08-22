"use client";
import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string | number | null | undefined;
  /** Receives the raw digit-only value (e.g. "10000"), ready to store or parse. */
  onValueChange: (digits: string) => void;
};

function toDigits(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\D/g, "");
}

function formatDigits(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

/**
 * Plain-number text input that displays a thousand-separated value (e.g. 10000 → "10.000")
 * while emitting the raw digit string via onValueChange, so callers can keep treating it
 * like a numeric field.
 */
export function NumberInput({ value, onValueChange, ...rest }: Props) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatDigits(toDigits(value))}
      onChange={(e) => onValueChange(toDigits(e.target.value))}
      {...rest}
    />
  );
}
