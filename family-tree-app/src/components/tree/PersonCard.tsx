"use client";

import type { LaidOutPerson } from "@/lib/layout";
import { fullName, initials, lifespanLabel } from "@/lib/person-display";

const RING: Record<string, string> = {
  MALE: "ring-sky-400/70",
  FEMALE: "ring-rose-400/70",
  UNKNOWN: "ring-border",
};

const AVATAR_BG: Record<string, string> = {
  MALE: "bg-sky-100 text-sky-700",
  FEMALE: "bg-rose-100 text-rose-700",
  UNKNOWN: "bg-neutral-200 text-neutral-600",
};

export function PersonCard({
  person,
  selected,
  highlighted,
  onClick,
}: {
  person: LaidOutPerson;
  selected: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full h-full flex flex-col items-center justify-center gap-2 rounded-2xl border bg-surface px-3 py-4 text-center shadow-sm transition",
        "hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        selected ? "border-primary ring-2 ring-primary" : "border-border ring-1 " + RING[person.gender],
        highlighted ? "animate-pulse ring-2 ring-accent" : "",
        !person.isAlive ? "opacity-80" : "",
      ].join(" ")}
    >
      <div
        className={[
          "w-14 h-14 rounded-full overflow-hidden flex items-center justify-center text-lg font-semibold shrink-0",
          person.photo ? "" : AVATAR_BG[person.gender],
        ].join(" ")}
      >
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.photo} alt="" className="w-full h-full object-cover" />
        ) : (
          initials(person)
        )}
      </div>
      <div className="min-w-0 w-full">
        <p className="text-sm font-semibold text-foreground truncate">{fullName(person)}</p>
        <p className="text-xs text-muted truncate">{lifespanLabel(person)}</p>
        {!person.isAlive && <p className="text-[10px] text-muted">(متوفى)</p>}
      </div>
    </button>
  );
}
