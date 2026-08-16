import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizePersonInput } from "@/lib/validation";

type Relation = "father" | "mother" | "spouse" | "child";
const RELATIONS = new Set<Relation>(["father", "mother", "spouse", "child"]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const validation = sanitizePersonInput(body?.person);
  if (!validation.data) return NextResponse.json({ error: validation.error ?? "بيانات غير صالحة" }, { status: 400 });
  const data = validation.data;

  const relation = RELATIONS.has(body?.relation) ? (body.relation as Relation) : undefined;
  const anchorPersonId = typeof body?.anchorPersonId === "string" ? body.anchorPersonId : undefined;

  if (relation && !anchorPersonId) {
    return NextResponse.json({ error: "يجب تحديد الشخص المرتبط" }, { status: 400 });
  }

  if (anchorPersonId) {
    const anchor = await db.person.findFirst({
      where: { id: anchorPersonId, familyId: session.family.id },
    });
    if (!anchor) return NextResponse.json({ error: "الشخص المرتبط غير موجود" }, { status: 404 });
  }

  const familyId = session.family.id;
  const createdById = session.member.id;

  const person = await db.$transaction(async (tx) => {
    const created = await tx.person.create({
      data: { ...data, familyId, createdById },
    });

    if (relation === "father" || relation === "mother") {
      await tx.parentChild.create({
        data: { familyId, parentId: created.id, childId: anchorPersonId! },
      });
    } else if (relation === "child") {
      await tx.parentChild.create({
        data: { familyId, parentId: anchorPersonId!, childId: created.id },
      });
    } else if (relation === "spouse") {
      const union = await tx.union.create({ data: { familyId } });
      await tx.unionMember.createMany({
        data: [
          { unionId: union.id, personId: anchorPersonId! },
          { unionId: union.id, personId: created.id },
        ],
      });
    }

    return created;
  });

  return NextResponse.json({ person }, { status: 201 });
}
