export function fullName(p: { firstName: string; lastName?: string | null }) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ");
}

export function lifespanLabel(p: { birthDate?: string | null; deathDate?: string | null; isAlive: boolean }) {
  if (!p.isAlive) {
    return `${p.birthDate || "؟"} - ${p.deathDate || "؟"}`;
  }
  return p.birthDate ? `و. ${p.birthDate}` : "";
}

export function initials(p: { firstName: string; lastName?: string | null }) {
  const a = p.firstName?.trim()?.[0] ?? "";
  const b = p.lastName?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "؟";
}
