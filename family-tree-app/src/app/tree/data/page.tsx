import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getFamilyGraph } from "@/lib/queries";
import { FamilyDataTable } from "@/components/tree/FamilyDataTable";

export default async function FamilyDataPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const graph = await getFamilyGraph(session.family.id);

  return <FamilyDataTable familyName={session.family.name} persons={graph.persons} unions={graph.unions} parentLinks={graph.parentLinks} />;
}
