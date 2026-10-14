/**
 * Logo RuangKerja (inline SVG, sumber: public/ruangkerja-icon.svg).
 * Garis mengikuti warna teks (`currentColor`): hitam di latar terang (utama),
 * putih di latar gelap. Kotak aksen selalu biru kobalt.
 */
export function LogoMark({ className = "w-7 h-7", variant = "dark" }: { className?: string; variant?: "dark" | "white" }) {
  return (
    <svg
      viewBox="0 0 600 600"
      className={`${variant === "white" ? "text-white" : "text-ink"} shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth={41.67} strokeLinecap="square">
        <path d="M75,75l433.333,0l0,266.667l-166.667,0l0,166.667l-266.667,0l0,-433.333Z" />
        <path d="M241.667,341.667l100,0l0,100" />
        <path d="M341.658,241.658l0.018,100l-100,0.018" />
      </g>
      <rect x="383.333" y="383.333" width="145.833" height="145.833" fill="#3247d1" />
    </svg>
  );
}

/** Ikon + tulisan "RuangKerja". */
export function Logo({ className = "", markClassName = "w-7 h-7", variant = "dark" }: { className?: string; markClassName?: string; variant?: "dark" | "white" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="RuangKerja">
      <LogoMark className={markClassName} variant={variant} />
      <span className={`text-[15px] font-semibold tracking-tight ${variant === "white" ? "text-white" : "text-ink"}`}>RuangKerja</span>
    </span>
  );
}
