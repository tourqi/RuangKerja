export function SortableHeader({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (col: string) => void;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-2 text-left text-xs font-medium text-muted whitespace-nowrap cursor-pointer select-none hover:bg-hover transition-colors group"
    >
      <span className="flex items-center gap-1">
        {label}
        <span
          className={`text-[10px] transition-colors ${
            active ? "text-ink" : "text-faint group-hover:text-faint"
          }`}
        >
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}
