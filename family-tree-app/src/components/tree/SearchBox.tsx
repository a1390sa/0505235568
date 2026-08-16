"use client";

import { useMemo, useState } from "react";
import type { PersonModel as Person } from "@/generated/prisma/models";
import { fullName } from "@/lib/person-display";

export function SearchBox({ persons, onSelect }: { persons: Person[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return persons.filter((p) => fullName(p).includes(q)).slice(0, 8);
  }, [query, persons]);

  return (
    <div className="relative w-full max-w-xs">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ابحث عن اسم..."
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg overflow-hidden">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onSelect(p.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full text-right px-3 py-2 text-sm hover:bg-background"
              >
                {fullName(p)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
