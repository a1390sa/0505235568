import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getFamilyGraph } from "@/lib/queries";
import { TreeView } from "@/components/tree/TreeView";

export default async function TreePage() {
  const session = await getSession();
  if (!session) redirect("/");

  const graph = await getFamilyGraph(session.family.id);

  return (
    <TreeView
      initialGraph={{
        family: { id: session.family.id, name: session.family.name, inviteToken: session.family.inviteToken },
        member: { id: session.member.id, displayName: session.member.displayName },
        ...graph,
      }}
    />
  );
}
