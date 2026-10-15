import { whatsappUrl } from "@/utils/whatsapp";

export function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.43 9.43 0 01-4.8-1.32l-.35-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 01-1.44-5.02c0-5.2 4.24-9.44 9.45-9.44 2.52 0 4.89.99 6.67 2.77a9.38 9.38 0 012.76 6.68c0 5.2-4.24 9.44-9.44 9.44zm8.04-17.48A11.3 11.3 0 0012.05.7C5.78.7.68 5.8.68 12.06c0 2 .52 3.96 1.52 5.68L.58 23.6l6-1.57a11.35 11.35 0 005.47 1.39h.01c6.26 0 11.36-5.1 11.37-11.36a11.3 11.3 0 00-3.34-8.04z" />
    </svg>
  );
}

/**
 * Tombol buka chat WhatsApp untuk sebuah nomor HP. Tidak dirender kalau
 * nomornya kosong atau bukan nomor seluler.
 * - `icon`: ikon saja (tabel, kartu mobile)
 * - `button`: tombol sekunder dengan label (header halaman detail)
 */
export function WhatsAppLink({ phone, variant = "icon" }: { phone?: string | null; variant?: "icon" | "button" }) {
  const url = whatsappUrl(phone);
  if (!url) return null;
  if (variant === "button") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-md border border-line bg-white text-ink hover:bg-hover transition-colors shrink-0"
      >
        <WhatsAppIcon className="w-3.5 h-3.5 text-success" />
        Chat WhatsApp
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Chat WhatsApp"
      aria-label="Chat WhatsApp"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="w-7 h-7 inline-flex items-center justify-center rounded-md text-faint hover:bg-hover hover:text-success transition"
    >
      <WhatsAppIcon />
    </a>
  );
}
