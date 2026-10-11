"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  page,
  totalPages,
  from,
  to,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 px-3 py-2 border-t border-line bg-white">
      {/* Info + page size */}
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          {total === 0 ? "0 data" : `${from}–${to} dari ${total}`}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border border-line rounded-md px-2 py-1 text-xs text-muted focus:outline-none focus:ring-2 focus:ring-accent/25"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s} / halaman</option>
          ))}
        </select>
      </div>

      {/* Page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PageBtn onClick={() => onPageChange(1)} disabled={page === 1} label="«" />
          <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} label="‹" />

          {pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-faint text-sm select-none">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-medium transition ${
                  p === page
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-hover"
                }`}
              >
                {p}
              </button>
            )
          )}

          <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages} label="›" />
          <PageBtn onClick={() => onPageChange(totalPages)} disabled={page === totalPages} label="»" />
        </div>
      )}
    </div>
  );
}

function PageBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-7 px-2 rounded-md text-xs text-muted hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition"
    >
      {label}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
