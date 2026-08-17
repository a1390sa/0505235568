"use client";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "تأكيد",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium">
            إلغاء
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-medium">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
