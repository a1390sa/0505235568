"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSessionForMember, clearSession } from "@/lib/auth";

export type ActionResult = { error: string } | void;

export async function createFamily(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const familyName = String(formData.get("familyName") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();

  if (!familyName) return { error: "الرجاء إدخال اسم العائلة" };
  if (!displayName) return { error: "الرجاء إدخال اسمك" };

  const family = await db.family.create({
    data: {
      name: familyName,
      members: { create: { displayName } },
    },
    include: { members: true },
  });

  await createSessionForMember(family.members[0].id);
  redirect("/tree");
}

export async function joinFamily(
  inviteToken: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const displayName = String(formData.get("displayName") || "").trim();
  if (!displayName) return { error: "الرجاء إدخال اسمك" };

  const family = await db.family.findUnique({ where: { inviteToken } });
  if (!family) return { error: "رابط الدعوة غير صالح أو منتهي" };

  const member = await db.member.create({
    data: { familyId: family.id, displayName },
  });

  await createSessionForMember(member.id);
  redirect("/tree");
}

export async function logout() {
  await clearSession();
  redirect("/");
}
