import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { sanitizePersonInput } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const existing = await db.person.findFirst({ where: { id, familyId: session.family.id } });
  if (!existing) return NextResponse.json({ error: "الشخص غير موجود" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const validation = sanitizePersonInput(body);
  if (!validation.data) return NextResponse.json({ error: validation.error ?? "بيانات غير صالحة" }, { status: 400 });

  const person = await db.person.update({ where: { id }, data: validation.data });
  return NextResponse.json({ person });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await context.params;
  const existing = await db.person.findFirst({ where: { id, familyId: session.family.id } });
  if (!existing) return NextResponse.json({ error: "الشخص غير موجود" }, { status: 404 });

  await db.person.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
