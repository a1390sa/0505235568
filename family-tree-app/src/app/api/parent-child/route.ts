import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parentId = String(body?.parentId || "");
  const childId = String(body?.childId || "");
  if (!parentId || !childId) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  if (parentId === childId) return NextResponse.json({ error: "لا يمكن ربط شخص بنفسه" }, { status: 400 });

  const familyId = session.family.id;
  const [parent, child] = await Promise.all([
    db.person.findFirst({ where: { id: parentId, familyId } }),
    db.person.findFirst({ where: { id: childId, familyId } }),
  ]);
  if (!parent || !child) return NextResponse.json({ error: "شخص غير موجود" }, { status: 404 });

  const link = await db.parentChild
    .create({ data: { familyId, parentId, childId } })
    .catch(() => null);
  if (!link) return NextResponse.json({ error: "هذه العلاقة موجودة بالفعل" }, { status: 409 });

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

  const existing = await db.parentChild.findFirst({ where: { id, familyId: session.family.id } });
  if (!existing) return NextResponse.json({ error: "العلاقة غير موجودة" }, { status: 404 });

  await db.parentChild.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
