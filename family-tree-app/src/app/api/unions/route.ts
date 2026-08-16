import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const personAId = String(body?.personAId || "");
  const personBId = String(body?.personBId || "");
  if (!personAId || !personBId) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (personAId === personBId) return NextResponse.json({ error: "لا يمكن ربط شخص بنفسه" }, { status: 400 });

  const familyId = session.family.id;
  const [a, b] = await Promise.all([
    db.person.findFirst({ where: { id: personAId, familyId } }),
    db.person.findFirst({ where: { id: personBId, familyId } }),
  ]);
  if (!a || !b) return NextResponse.json({ error: "شخص غير موجود" }, { status: 404 });

  const union = await db.union.create({
    data: {
      familyId,
      members: { create: [{ personId: personAId }, { personId: personBId }] },
    },
    include: { members: true },
  });

  return NextResponse.json({ union }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const existing = await db.union.findFirst({ where: { id, familyId: session.family.id } });
  if (!existing) return NextResponse.json({ error: "العلاقة غير موجودة" }, { status: 404 });

  await db.union.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
