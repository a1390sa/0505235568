import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getFamilyGraph } from "@/lib/queries";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const graph = await getFamilyGraph(session.family.id);
  return NextResponse.json({
    family: { id: session.family.id, name: session.family.name, inviteToken: session.family.inviteToken },
    member: { id: session.member.id, displayName: session.member.displayName },
    ...graph,
  });
}
