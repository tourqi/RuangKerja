"use client";
import { useState } from "react";
import type { GeneralExpense, GeneralExpenseKategori } from "@/types/db";
import { deleteGeneralExpense } from "@/services/generalExpenses";
import { GeneralExpenseFormModal } from "./GeneralExpenseFormModal";
import { ActionDropdown } from "@/components/ActionDropdown";
import Pagination from "@/components/Pagination";
import { usePagination } from "@/hooks/usePagination";
import { MobileCardList, MobileCard, MobileCardHeader, MobileCardRow, MobileCardIconButton, PencilIcon, TrashIcon } from "@/components/MobileCard";

const fmt = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const KATEGORI_LABEL: Record<GeneralExpenseKategori, string> = {
  operasional: "Operasional Kantor",
  marketing: "Marketing & Iklan",
  gaji: "Gaji & SDM",
  lainnya: "Lainnya",
};

const KATEGORI_BADGE: Record<GeneralExpenseKategori, string> = {
  operasional: "bg-blue-100 text-blue-700",
  marketing: "bg-purple-100 text-purple-700",
  gaji: "bg-amber-100 text-amber-700",
  lainnya: "bg-gray-100 text-gray-600",
};

const KATEGORI_ALL = ["operasional", "marketing", "gaji", "lainnya"] as GeneralExpenseKategori[];

interface Props {
  expenses: GeneralExpense[];
  loading: boolean;
  onRefresh: () => void;
}

export function PengeluaranUmumTable({ expenses, loading, onRefresh }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GeneralExpense | null>(null);
  const [filterKategori, setFilterKategori] = useState<GeneralExpenseKategori | "">("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = expenses.filter((e) => {
    if (filterKategori && e.kategori !== filterKategori) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.deskripsi.toLowerCase().includes(q) ||
        (e.vendor ?? "").toLowerCase().includes(q) ||
        (e.sub_kategori ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.jumlah, 0);

  const { paged, page, goTo, pageSize, changePageSize, totalPages, from, to, total: totalCount } = usePagination(filtered);

  async function handleDelete(id: string) {
    if (!confirm("Hapus pengeluaran ini?")) return;
    setDeleting(id);
    try {
      await deleteGeneralExpense(id);
      onRefresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary + Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {KATEGORI_ALL.map((k) => {
            const sum = expenses.filter((e) => e.kategori === k).reduce((s, e) => s + e.jumlah, 0);
            return (
              <div key={k} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 min-w-[140px]">
                <p className="text-xs text-gray-400 mb-0.5">{KATEGORI_LABEL[k]}</p>
                <p className="text-sm font-bold text-gray-900">{fmt(sum)}</p>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Pengeluaran
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi, vendor..."
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 w-48"
          />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value as GeneralExpenseKategori | "")}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="">Semua Kategori</option>
            {KATEGORI_ALL.map((k) => (
              <option key={k} value={k}>{KATEGORI_LABEL[k]}</option>
            ))}
          </select>
          {(search || filterKategori) && (
            <button
              onClick={() => { setSearch(""); setFilterKategori(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Reset
            </button>
          )}
          <span className="ml-auto text-xs text-gray-500">
            {filtered.length} item &bull; Total: <span className="font-semibold text-gray-900">{fmt(total)}</span>
          </span>
        </div>
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Memuat data...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {expenses.length === 0
              ? "Belum ada pengeluaran. Klik \"Tambah Pengeluaran\" untuk mulai mencatat."
              : "Tidak ada data yang cocok dengan filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Aksi</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 w-10">No</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Tanggal</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Deskripsi</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500">Kategori</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 hidden md:table-cell">Vendor</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paged.map((expense, idx) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <ActionDropdown
                        align="left"
                        items={[
                          {
                            key: "edit",
                            label: "Edit",
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            ),
                            onClick: () => { setEditing(expense); setModalOpen(true); },
                          },
                          {
                            key: "delete",
                            label: "Hapus",
                            danger: true,
                            disabled: deleting === expense.id,
                            icon: (
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            ),
                            onClick: () => handleDelete(expense.id),
                          },
                        ]}
                      />
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{from + idx}</td>
                    <td className="py-3 px-4 text-xs text-gray-700 whitespace-nowrap">
                      {new Date(expense.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <p className="text-xs text-gray-900 font-medium truncate">{expense.deskripsi}</p>
                      {expense.sub_kategori && (
                        <p className="text-xs text-gray-400 truncate">{expense.sub_kategori}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORI_BADGE[expense.kategori]}`}>
                        {KATEGORI_LABEL[expense.kategori]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 hidden md:table-cell">
                      {expense.vendor ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-semibold text-red-600 whitespace-nowrap">
                      {fmt(expense.jumlah)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={6} className="py-3 px-4 text-xs font-bold text-gray-900">Total</td>
                  <td className="py-3 px-4 text-right text-xs font-bold text-red-600 whitespace-nowrap">{fmt(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            from={from}
            to={to}
            total={totalCount}
            pageSize={pageSize}
            onPageChange={goTo}
            onPageSizeChange={changePageSize}
          />
        )}
      </div>

      {/* Cards (mobile) */}
      <div className="sm:hidden">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
            {expenses.length === 0
              ? "Belum ada pengeluaran. Klik \"Tambah Pengeluaran\" untuk mulai mencatat."
              : "Tidak ada data yang cocok dengan filter."}
          </div>
        ) : (
          <>
            <MobileCardList>
              {paged.map((expense) => (
                <MobileCard key={expense.id}>
                  <MobileCardHeader
                    title={expense.deskripsi}
                    subtitle={expense.sub_kategori ? <span className="text-xs text-gray-400">{expense.sub_kategori}</span> : undefined}
                    actions={
                      <>
                        <MobileCardIconButton title="Edit" onClick={() => { setEditing(expense); setModalOpen(true); }}><PencilIcon /></MobileCardIconButton>
                        <MobileCardIconButton title="Hapus" danger disabled={deleting === expense.id} onClick={() => handleDelete(expense.id)}><TrashIcon /></MobileCardIconButton>
                      </>
                    }
                  />
                  <MobileCardRow label="Tanggal">
                    {new Date(expense.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </MobileCardRow>
                  <MobileCardRow label="Kategori">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${KATEGORI_BADGE[expense.kategori]}`}>
                      {KATEGORI_LABEL[expense.kategori]}
                    </span>
                  </MobileCardRow>
                  <MobileCardRow label="Vendor">{expense.vendor ?? "—"}</MobileCardRow>
                  <MobileCardRow label="Jumlah">
                    <span className="text-red-600 font-semibold">{fmt(expense.jumlah)}</span>
                  </MobileCardRow>
                </MobileCard>
              ))}
            </MobileCardList>
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
              <span>Total ({filtered.length} item)</span>
              <span className="font-bold text-red-600">{fmt(total)}</span>
            </div>
            <div className="mt-3 bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <Pagination
                page={page}
                totalPages={totalPages}
                from={from}
                to={to}
                total={totalCount}
                pageSize={pageSize}
                onPageChange={goTo}
                onPageSizeChange={changePageSize}
              />
            </div>
          </>
        )}
      </div>

      <GeneralExpenseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        expense={editing}
      />
    </div>
  );
}
