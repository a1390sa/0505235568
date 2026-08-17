import type { PersonModel as Person } from "@/generated/prisma/models";
import type { Relation } from "@/lib/api-client";

// The family name (لقب العائلة) is only ever confidently known through the
// male line: a son inherits his father's family name, and a person's father
// therefore carries the same family name as the person. Mothers and spouses
// keep their own family name, so we never guess those.
export function suggestLastName(
  relation: Relation | undefined,
  anchor: Person | undefined,
  anchorSpouses: Person[]
): string | undefined {
  if (!relation || !anchor) return undefined;

  if (relation === "father") {
    return anchor.lastName ?? undefined;
  }

  if (relation === "child") {
    if (anchor.gender === "MALE") return anchor.lastName ?? undefined;
    if (anchor.gender === "FEMALE" && anchorSpouses.length === 1) {
      const husband = anchorSpouses[0];
      if (husband.gender === "MALE") return husband.lastName ?? undefined;
    }
  }

  return undefined;
}
