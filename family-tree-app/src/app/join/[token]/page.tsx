import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { JoinFamilyForm } from "@/components/JoinFamilyForm";

export default async function JoinPage(props: PageProps<"/join/[token]">) {
  const { token } = await props.params;

  const family = await db.family.findUnique({ where: { inviteToken: token } });
  if (!family) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">رابط الدعوة غير صالح</h1>
        <p className="text-muted">تأكد من نسخ الرابط كاملاً، أو اطلب رابطاً جديداً من أحد أفراد العائلة.</p>
      </main>
    );
  }

  const session = await getSession();
  if (session && session.family.id === family.id) {
    redirect("/tree");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center flex flex-col gap-2">
        <p className="text-muted">دعوة للانضمام إلى</p>
        <h1 className="text-3xl font-bold text-foreground">{family.name}</h1>
      </div>
      <JoinFamilyForm token={token} />
    </main>
  );
}
