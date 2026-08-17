"use client";

import type { PersonModel as Person } from "@/generated/prisma/models";
import type { Relation } from "@/lib/api-client";
import { fullName, initials, lifespanLabel } from "@/lib/person-display";

function RelatedList({ title, people }: { title: string; people: Person[] }) {
  if (people.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted mb-1">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {people.map((p) => (
          <li key={p.id} className="text-sm text-foreground">
            {fullName(p)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PersonDrawer({
  person,
  parents,
  siblings,
  kids,
  spouses,
  canAddParent,
  onClose,
  onEdit,
  onDelete,
  onAddRelative,
}: {
  person: Person;
  parents: Person[];
  siblings: Person[];
  kids: Person[];
  spouses: Person[];
  canAddParent: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddRelative: (relation: Relation) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30 sm:bg-transparent sm:pointer-events-none" onClick={onClose}>
      <aside
        className="h-full w-full sm:w-96 bg-surface shadow-xl overflow-y-auto pointer-events-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center text-lg font-semibold shrink-0">
              {person.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                initials(person)
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{fullName(person)}</h2>
              <p className="text-sm text-muted">{lifespanLabel(person)}</p>
              {!person.isAlive && <p className="text-xs text-muted">(متوفى)</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none px-1">
            ×
          </button>
        </div>

        {person.notes && (
          <div className="px-5 pt-4">
            <p className="text-xs font-medium text-muted mb-1">ملاحظات</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{person.notes}</p>
          </div>
        )}

        <div className="px-5 pt-4 flex flex-col gap-3">
          <RelatedList title="الوالدان" people={parents} />
          <RelatedList title="الإخوة" people={siblings} />
          <RelatedList title="الزوج/الزوجة" people={spouses} />
          <RelatedList title="الأبناء" people={kids} />
        </div>

        <div className="p-5 mt-auto flex flex-col gap-2 border-t border-border">
          <p className="text-xs font-medium text-muted mb-1">إضافة قريب</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={!canAddParent}
              onClick={() => onAddRelative("father")}
              className="rounded-lg border border-border py-2 text-sm disabled:opacity-40 hover:bg-background"
            >
              + أب
            </button>
            <button
              disabled={!canAddParent}
              onClick={() => onAddRelative("mother")}
              className="rounded-lg border border-border py-2 text-sm disabled:opacity-40 hover:bg-background"
            >
              + أم
            </button>
            <button
              onClick={() => onAddRelative("spouse")}
              className="rounded-lg border border-border py-2 text-sm hover:bg-background"
            >
              + زوج/زوجة
            </button>
            <button
              onClick={() => onAddRelative("child")}
              className="rounded-lg border border-border py-2 text-sm hover:bg-background"
            >
              + ابن/ابنة
            </button>
          </div>

          <div className="flex gap-2 mt-2">
            <button onClick={onEdit} className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium">
              تعديل البيانات
            </button>
            <button onClick={onDelete} className="flex-1 rounded-lg border border-red-300 text-red-600 py-2.5 text-sm font-medium">
              حذف
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
