"use client";

import { useState } from "react";
import {
  GREGORIAN_MONTHS,
  HIJRI_MONTHS,
  formatHijri,
  gregorianToHijri,
  hijriToGregorian,
  parseStoredDate,
  type PartialDate,
} from "@/lib/hijri";

function toNum(v: string): number | undefined {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Converts a Hijri partial date to its Gregorian equivalent for display when
// switching calendars. Missing month/day are approximated with a mid-point
// so the resulting year (or year+month) is still a reasonable estimate.
function hijriToGregorianPartial(h: PartialDate): PartialDate {
  if (!h.year) return {};
  if (h.month && h.day) return hijriToGregorian({ year: h.year, month: h.month, day: h.day });
  if (h.month) {
    const g = hijriToGregorian({ year: h.year, month: h.month, day: 15 });
    return { year: g.year, month: g.month };
  }
  const g = hijriToGregorian({ year: h.year, month: 7, day: 1 });
  return { year: g.year };
}

function gregorianToHijriPartial(g: PartialDate): PartialDate {
  if (!g.year) return {};
  if (g.month && g.day) return gregorianToHijri({ year: g.year, month: g.month, day: g.day });
  if (g.month) {
    const h = gregorianToHijri({ year: g.year, month: g.month, day: 15 });
    return { year: h.year, month: h.month };
  }
  const h = gregorianToHijri({ year: g.year, month: 7, day: 1 });
  return { year: h.year };
}

export function HijriDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const initial = parseStoredDate(value) ?? {};
  const [calendar, setCalendar] = useState<"hijri" | "gregorian">("hijri");
  const [hijri, setHijri] = useState<PartialDate>(initial);
  const [gregorian, setGregorian] = useState<PartialDate>({});

  function updateHijri(next: PartialDate) {
    setHijri(next);
    onChange(formatHijri(next));
  }

  function updateGregorian(next: PartialDate) {
    setGregorian(next);
    const asHijri = gregorianToHijriPartial(next);
    setHijri(asHijri);
    onChange(formatHijri(asHijri));
  }

  function switchTo(next: "hijri" | "gregorian") {
    if (next === calendar) return;
    if (next === "gregorian") setGregorian(hijriToGregorianPartial(hijri));
    setCalendar(next);
  }

  const months = calendar === "hijri" ? HIJRI_MONTHS : GREGORIAN_MONTHS;
  const active = calendar === "hijri" ? hijri : gregorian;
  const update = calendar === "hijri" ? updateHijri : updateGregorian;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => switchTo("hijri")}
            className={calendar === "hijri" ? "bg-primary text-primary-foreground px-2 py-1" : "px-2 py-1 text-muted"}
          >
            هجري
          </button>
          <button
            type="button"
            onClick={() => switchTo("gregorian")}
            className={calendar === "gregorian" ? "bg-primary text-primary-foreground px-2 py-1" : "px-2 py-1 text-muted"}
          >
            ميلادي
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          value={active.year ?? ""}
          onChange={(e) => update({ ...active, year: toNum(e.target.value) })}
          placeholder="السنة"
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={active.month ?? ""}
          onChange={(e) => {
            const month = e.target.value ? Number(e.target.value) : undefined;
            update({ ...active, month, day: month ? active.day : undefined });
          }}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">الشهر</option>
          {months.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={active.day ?? ""}
          onChange={(e) => update({ ...active, day: toNum(e.target.value) })}
          placeholder="اليوم"
          disabled={!active.month}
          min={1}
          max={31}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
      </div>

      {calendar === "gregorian" && hijri.year && (
        <p className="text-xs text-muted">يعادل: {formatHijri(hijri)}</p>
      )}
    </div>
  );
}
