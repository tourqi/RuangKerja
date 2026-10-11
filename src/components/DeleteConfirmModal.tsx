"use client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-2">{title}</h3>
        <p className="text-sm text-muted mb-5">{description}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-danger text-white text-sm font-medium rounded-md hover:bg-danger/90 transition disabled:opacity-50"
          >
            {saving ? "Menghapus..." : confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-hover text-ink text-sm font-medium rounded-md hover:bg-hover transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
