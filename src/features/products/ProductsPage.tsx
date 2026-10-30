"use client";
import { useMemo, useState } from "react";
import type { Product } from "@/types/db";
import { deleteProduct } from "@/services/products";
import { useProducts, useProductUsage } from "@/hooks/useProducts";
import { usePagination } from "@/hooks/usePagination";
import { ActionDropdown } from "@/components/ActionDropdown";
import { MobileCard, MobileCardHeader, MobileCardIconButton, MobileCardList, MobileCardRow, PencilIcon, TrashIcon } from "@/components/MobileCard";
import Pagination from "@/components/Pagination";
import { Select } from "@/components/Select";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/Toast";
import { StatusDot, PRODUCT_STATUS_TONE } from "@/components/ui/StatusDot";
import { PRODUCT_KATEGORI, PRODUCT_TANGGA, toOptions } from "@/constants/options";
import { computeProductStats, sortProductsByDemand } from "@/utils/productStats";
import { formatIDR } from "@/utils/format";
import { ProductFormModal } from "./ProductFormModal";

function formatHarga(product: Product) {
  if (product.harga_mulai == null) return "—";
  const harga = product.harga_sampai != null
    ? `${formatIDR(product.harga_mulai)} – ${formatIDR(product.harga_sampai)}`
    : `Mulai ${formatIDR(product.harga_mulai)}`;
  return product.satuan ? `${harga} ${product.satuan}` : harga;
}

export default function ProductsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { products, loading, refetch } = useProducts();
  const { usage, loading: loadingUsage } = useProductUsage();
  const [search, setSearch] = useState("");
  const [kategori, setKategori] = useState("");
  const [tangga, setTangga] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stats = useMemo(() => computeProductStats(usage), [usage]);
  const ranked = useMemo(() => sortProductsByDemand(products, stats), [products, stats]);
  const filtered = ranked.filter((product) => {
    if (kategori && product.kategori !== kategori) return false;
    if (tangga && product.tangga !== tangga) return false;
    const q = search.trim().toLowerCase();
    return !q || product.nama.toLowerCase().includes(q) || product.kode.toLowerCase().includes(q);
  });
  const { paged, page, goTo, pageSize, changePageSize, totalPages, from, to, total } = usePagination(filtered);

  const top = ranked[0];
  const topDibeli = top ? stats[top.id]?.dibeli ?? 0 : 0;
  const isLoading = loading || loadingUsage;

  function openForm(product: Product | null) {
    setEditing(product);
    setModalOpen(true);
  }

  async function handleDelete(product: Product) {
    if (!(await confirm({ title: "Hapus produk?", description: `${product.nama} akan dihapus permanen dari katalog.` }))) return;
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      await refetch();
      toast("Produk dihapus", "success");
    } catch (err: unknown) {
      toast((err as Error)?.message ?? "Gagal menghapus produk. Coba lagi.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  const emptyMessage = products.length === 0
    ? "Belum ada produk. Klik \"Tambah Produk\" untuk mulai mengisi katalog."
    : "Tidak ada produk yang cocok dengan filter.";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Produk</h1>
        <p className="text-[13px] text-muted mt-0.5">
          {topDibeli > 0 ? `${top.nama} paling banyak dibeli, ${topDibeli} lead` : "Belum ada produk yang tercatat dibeli"}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{filtered.length} produk</p>
        <button
          onClick={() => openForm(null)}
          className="px-2.5 py-1.5 bg-accent text-white rounded-md text-[13px] font-medium hover:bg-accent-hover transition"
        >
          Tambah Produk
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau kode"
          aria-label="Cari produk"
          className="border border-line rounded-md px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/25 w-52"
        />
        <div className="w-44">
          <Select value={kategori} onChange={setKategori} options={toOptions(PRODUCT_KATEGORI)} placeholder="Semua kategori" />
        </div>
        <div className="w-36">
          <Select value={tangga} onChange={setTangga} options={toOptions(PRODUCT_TANGGA)} placeholder="Semua tangga" />
        </div>
      </div>

      <div className="hidden sm:block bg-white rounded-md border border-line overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-faint">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-faint">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted w-10"><span className="sr-only">Aksi</span></th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Kode</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Produk</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Tangga</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Harga referensi</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted">Diminati</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted">Dibeli</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paged.map((product) => (
                  <tr key={product.id} className="hover:bg-hover transition-colors">
                    <td className="px-3 py-2">
                      <ActionDropdown
                        align="left"
                        items={[
                          { key: "edit", label: "Edit", icon: <PencilIcon />, onClick: () => openForm(product) },
                          { key: "delete", label: "Hapus", danger: true, disabled: deletingId === product.id, icon: <TrashIcon />, onClick: () => handleDelete(product) },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted">{product.kode}</td>
                    <td className="px-3 py-2">
                      <p className="text-ink font-medium">{product.nama}</p>
                      <p className="text-xs text-faint">{product.kategori}</p>
                    </td>
                    <td className="px-3 py-2 text-muted">{product.tangga ?? "—"}</td>
                    <td className="px-3 py-2 text-muted whitespace-nowrap">{formatHarga(product)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">{stats[product.id]?.diminati ?? 0}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink">{stats[product.id]?.dibeli ?? 0}</td>
                    <td className="px-3 py-2">
                      <StatusDot tone={product.aktif ? PRODUCT_STATUS_TONE[product.status] ?? "neutral" : "neutral"}>
                        {product.aktif ? product.status : "Nonaktif"}
                      </StatusDot>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} pageSize={pageSize} onPageChange={goTo} onPageSizeChange={changePageSize} />
        )}
      </div>

      <div className="sm:hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-faint bg-white rounded-lg border border-line">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-faint bg-white rounded-lg border border-line">{emptyMessage}</div>
        ) : (
          <>
            <MobileCardList>
              {paged.map((product) => (
                <MobileCard key={product.id}>
                  <MobileCardHeader
                    title={product.nama}
                    subtitle={<span className="text-xs text-faint">{product.kode} · {product.kategori}</span>}
                    actions={
                      <>
                        <MobileCardIconButton title="Edit" onClick={() => openForm(product)}><PencilIcon /></MobileCardIconButton>
                        <MobileCardIconButton title="Hapus" danger disabled={deletingId === product.id} onClick={() => handleDelete(product)}><TrashIcon /></MobileCardIconButton>
                      </>
                    }
                  />
                  <MobileCardRow label="Tangga">{product.tangga ?? "—"}</MobileCardRow>
                  <MobileCardRow label="Harga referensi">{formatHarga(product)}</MobileCardRow>
                  <MobileCardRow label="Diminati">{stats[product.id]?.diminati ?? 0}</MobileCardRow>
                  <MobileCardRow label="Dibeli">{stats[product.id]?.dibeli ?? 0}</MobileCardRow>
                  <MobileCardRow label="Status">{product.aktif ? product.status : "Nonaktif"}</MobileCardRow>
                </MobileCard>
              ))}
            </MobileCardList>
            <div className="mt-3 bg-white rounded-lg border border-line overflow-hidden">
              <Pagination page={page} totalPages={totalPages} from={from} to={to} total={total} pageSize={pageSize} onPageChange={goTo} onPageSizeChange={changePageSize} />
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <ProductFormModal
          product={editing}
          onSaved={() => { setModalOpen(false); refetch(); }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
