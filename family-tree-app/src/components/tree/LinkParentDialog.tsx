"use client";

import type { PersonModel as Person } from "@/generated/prisma/models";
import { fullName } from "@/lib/person-display";

export function LinkParentDialog({
  childName,
  anchorName,
  candidates,
  onPick,
  onSkip,
}: {
  childName: string;
  anchorName: string;
  candidates: Person[];
  onPick: (personId: string) => void;
  onSkip: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onSkip}>
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground mb-2">ربط الوالد الآخر</h2>
        <p className="text-sm text-muted mb-4">
          {anchorName} مرتبط بزوج/زوجة مسجلة لدينا. هل أحدهم هو الوالد الآخر لـ{childName}؟
        </p>
        <div className="flex flex-col gap-2 mb-3">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-background text-primary"
            >
              نعم، {fullName(c)}
            </button>
          ))}
        </div>
        <button onClick={onSkip} className="w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted">
          لا أحد منهم
        </button>
      </div>
    </div>
  );
}
