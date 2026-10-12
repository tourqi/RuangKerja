"use client";
import { DialogA11y } from "./DialogA11y";

type Props = {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  saving?: boolean;
  confirmLabel?: string;
};

export function DeleteConfirmModal({
  title,
  description,
  onConfirm,
  onClose,
  saving = false,
  confirmLabel = "Ya, Hapus",
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="bg-white rounded-lg border border-line shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fokus awal jatuh ke tombol pertama ("Batal") supaya Enter tidak langsung menghapus */}
        <DialogA11y onClose={onClose} />
        <h3 id="confirm-title" className="text-[15px] font-semibold text-ink mb-1.5">{title}</h3>
        <p id="confirm-desc" className="text-[13px] text-muted mb-5">{description}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border border-line bg-white text-ink text-[13px] font-medium rounded-md hover:bg-hover transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-3 py-1.5 bg-danger text-white text-[13px] font-medium rounded-md hover:bg-danger/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
