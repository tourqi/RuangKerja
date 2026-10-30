"use client";
import { useState } from "react";
import type { Product } from "@/types/db";
import { PRODUCT_KATEGORI } from "@/constants/options";

type Props = {
  id: string;
  products: Product[];
  value: string[];
  onChange: (ids: string[]) => void;
};

/** Daftar centang produk per kategori. Produk nonaktif hanya muncul kalau sudah terpilih. */
export function ProductPicker({ id, products, value, onChange }: Props) {
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const visible = products.filter(
    (p) => (p.aktif || value.includes(p.id)) && (!q || p.nama.toLowerCase().includes(q) || p.kategori.toLowerCase().includes(q))
  );
  const otherKategori = [...new Set(visible.map((p) => p.kategori))].filter(
    (k) => !(PRODUCT_KATEGORI as readonly string[]).includes(k)
  );
  const groups = [...PRODUCT_KATEGORI, ...otherKategori]
    .map((kategori) => ({ kategori, items: visible.filter((p) => p.kategori === kategori) }))
    .filter((group) => group.items.length > 0);

  function toggle(productId: string) {
    onChange(value.includes(productId) ? value.filter((v) => v !== productId) : [...value, productId]);
  }

  return (
    <div className="border border-line-strong rounded-md">
      <div className="flex items-center gap-3 px-3 py-2 border-b border-line">
        <input
          id={id}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk"
          className="flex-1 min-w-0 text-sm text-ink outline-none"
        />
        <span className="text-xs text-faint shrink-0">{value.length} dipilih</span>
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-3">
        {groups.length === 0 && (
          <p className="text-sm text-faint">{products.length === 0 ? "Belum ada produk di katalog." : "Produk tidak ditemukan."}</p>
        )}
        {groups.map((group) => (
          <fieldset key={group.kategori}>
            <legend className="text-xs font-medium text-muted mb-1">{group.kategori}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
              {group.items.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-[13px] text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value.includes(product.id)}
                    onChange={() => toggle(product.id)}
                    className="accent-accent"
                  />
                  <span className="truncate">{product.nama}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
