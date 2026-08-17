"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type {
  PersonModel as Person,
  UnionModel as Union,
  UnionMemberModel as UnionMember,
  ParentChildModel as ParentChild,
} from "@/generated/prisma/models";
import { fullName, lifespanLabel } from "@/lib/person-display";

type Row = {
  person: Person;
  father?: Person;
  mother?: Person;
  spouses: Person[];
  children: Person[];
};

function buildRows(persons: Person[], unions: (Union & { members: UnionMember[] })[], parentLinks: ParentChild[]): Row[] {
  const personById = new Map(persons.map((p) => [p.id, p]));
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const pl of parentLinks) {
    if (!parentsOf.has(pl.childId)) parentsOf.set(pl.childId, []);
    parentsOf.get(pl.childId)!.push(pl.parentId);
    if (!childrenOf.has(pl.parentId)) childrenOf.set(pl.parentId, []);
    childrenOf.get(pl.parentId)!.push(pl.childId);
  }
  const spousesOf = new Map<string, string[]>();
  for (const u of unions) {
    const ids = u.members.map((m) => m.personId);
    for (const id of ids) {
      if (!spousesOf.has(id)) spousesOf.set(id, []);
      spousesOf.get(id)!.push(...ids.filter((x) => x !== id));
    }
  }

  const resolve = (ids: string[] | undefined) =>
    (ids ?? []).map((id) => personById.get(id)).filter(Boolean as unknown as (p: Person | undefined) => p is Person);

  return persons
    .map((person) => {
      const parents = resolve(parentsOf.get(person.id));
      return {
        person,
        father: parents.find((p) => p.gender === "MALE"),
        mother: parents.find((p) => p.gender === "FEMALE"),
        spouses: resolve(spousesOf.get(person.id)),
        children: resolve(childrenOf.get(person.id)),
      };
    })
    .sort((a, b) => fullName(a.person).localeCompare(fullName(b.person), "ar"));
}

export function FamilyDataTable({
  familyName,
  persons,
  unions,
  parentLinks,
}: {
  familyName: string;
  persons: Person[];
  unions: (Union & { members: UnionMember[] })[];
  parentLinks: ParentChild[];
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => buildRows(persons, unions, parentLinks), [persons, unions, parentLinks]);
  const filtered = query.trim()
    ? rows.filter((r) => fullName(r.person).includes(query.trim()))
    : rows;

  return (
    <div className="flex flex-col h-dvh">
      <header className="flex flex-wrap items-center gap-3 justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/tree" className="text-sm text-primary underline whitespace-nowrap">
            → الشجرة
          </Link>
          <h1 className="font-bold text-foreground">بيانات {familyName}</h1>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن اسم..."
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary w-56"
        />
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-background text-right">
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الاسم</th>
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الجنس</th>
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الحالة</th>
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الأب</th>
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الأم</th>
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الزوج/الزوجة</th>
                <th className="px-3 py-2 font-medium text-muted whitespace-nowrap">الأبناء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.person.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap font-medium text-foreground">{fullName(row.person)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">
                    {row.person.gender === "MALE" ? "ذكر" : row.person.gender === "FEMALE" ? "أنثى" : "—"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{lifespanLabel(row.person) || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{row.father ? fullName(row.father) : "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted">{row.mother ? fullName(row.mother) : "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {row.spouses.length ? row.spouses.map(fullName).join("، ") : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted">
                    {row.children.length ? row.children.map(fullName).join("، ") : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-muted">
                    لا توجد نتائج
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
