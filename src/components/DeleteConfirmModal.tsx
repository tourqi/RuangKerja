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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-5">{description}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {saving ? "Menghapus..." : confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
