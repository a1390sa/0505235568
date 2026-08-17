"use client";

import { useState } from "react";
import type { PersonModel as Person } from "@/generated/prisma/models";
import { logout } from "@/app/actions/family";
import { SearchBox } from "./SearchBox";

export function TopBar({
  familyName,
  inviteToken,
  memberName,
  persons,
  onSelectPerson,
  onAddPerson,
  onPrint,
}: {
  familyName: string;
  inviteToken: string;
  memberName: string;
  persons: Person[];
  onSelectPerson: (id: string) => void;
  onAddPerson: () => void;
  onPrint: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    const url = `${window.location.origin}/join/${inviteToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("انسخ رابط الدعوة:", url);
    }
  }

  return (
    <header className="flex flex-wrap items-center gap-3 justify-between border-b border-border bg-surface px-4 py-3 print:hidden">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="font-bold text-foreground truncate">{familyName}</h1>
        <span className="text-xs text-muted hidden sm:inline">مرحباً {memberName}</span>
      </div>

      <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
        <SearchBox persons={persons} onSelect={onSelectPerson} />

        <button
          onClick={onAddPerson}
          className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium whitespace-nowrap"
        >
          + إضافة شخص
        </button>

        <button
          onClick={onPrint}
          className="rounded-lg border border-border px-3 py-2 text-sm whitespace-nowrap"
        >
          طباعة
        </button>

        <button
          onClick={copyInviteLink}
          className="rounded-lg border border-border px-3 py-2 text-sm whitespace-nowrap"
        >
          {copied ? "تم النسخ ✓" : "رابط الدعوة"}
        </button>

        <form action={logout}>
          <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm text-muted whitespace-nowrap">
            خروج
          </button>
        </form>
      </div>
    </header>
  );
}
