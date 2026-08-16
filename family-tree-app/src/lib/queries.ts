import { db } from "@/lib/db";

export async function getFamilyGraph(familyId: string) {
  const [persons, unions, parentLinks] = await Promise.all([
    db.person.findMany({
      where: { familyId },
      orderBy: { createdAt: "asc" },
    }),
    db.union.findMany({
      where: { familyId },
      include: { members: true },
    }),
    db.parentChild.findMany({
      where: { familyId },
    }),
  ]);

  return { persons, unions, parentLinks };
}

export type FamilyGraph = Awaited<ReturnType<typeof getFamilyGraph>>;
