"use client";
import { useState, useEffect, useMemo } from "react";

export function usePagination<T>(data: T[], initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset ke halaman 1 setiap kali data berubah (filter/sort)
  useEffect(() => { setPage(1); }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const paged = useMemo(
    () => data.slice((page - 1) * pageSize, page * pageSize),
    [data, page, pageSize]
  );

  function goTo(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages));
  }

  function changePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  const from = data.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, data.length);

  return { paged, page, goTo, pageSize, changePageSize, totalPages, from, to, total: data.length };
}
