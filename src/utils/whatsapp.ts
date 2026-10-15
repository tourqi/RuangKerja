import { normalizePhone } from "@/utils/clientImport";

/**
 * Link wa.me untuk nomor HP Indonesia, atau null kalau nomornya bukan nomor
 * seluler (WhatsApp cuma jalan di nomor 08…, bukan telepon rumah 021…).
 */
export function whatsappUrl(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = normalizePhone(phone);
  if (!digits.startsWith("08") || digits.length < 10 || digits.length > 13) return null;
  return `https://wa.me/62${digits.slice(1)}`;
}
