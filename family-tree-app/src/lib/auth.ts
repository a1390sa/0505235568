import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "ft_session";
const SESSION_DAYS = 365;

export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { member: { include: { family: true } } },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return { member: session.member, family: session.member.family };
}

export async function createSessionForMember(memberId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await db.session.create({
    data: { memberId, expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  store.delete(SESSION_COOKIE);
}
