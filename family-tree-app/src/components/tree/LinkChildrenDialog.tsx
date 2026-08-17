"use client";

import { useState } from "react";
import type { PersonModel as Person } from "@/generated/prisma/models";
import { fullName } from "@/lib/person-display";

export function LinkChildrenDialog({
  spouseName,
  anchorName,
  candidates,
  onConfirm,
  onSkip,
}: {
  spouseName: string;
  anchorName: string;
  candidates: Person[];
  onConfirm: (childIds: string[]) => void;
  onSkip: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(candidates.map((c) => c.id)));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden" onClick={onSkip}>
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground mb-2">ربط الأبناء الحاليين</h2>
        <p className="text-sm text-muted mb-4">
          لدى {anchorName} أبناء مسجلون بدون والد/والدة ثانٍ. هل {spouseName} هي/هو والدهم؟ اختر من تريد ربطه:
        </p>
        <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
          {candidates.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              {fullName(c)}
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onSkip} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-muted">
            تخطي
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-50"
          >
            ربط
          </button>
        </div>
      </div>
    </div>
  );
}
