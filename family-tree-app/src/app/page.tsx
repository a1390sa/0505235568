import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CreateFamilyForm } from "@/components/CreateFamilyForm";

export default async function Home() {
  const session = await getSession();
  if (session) redirect("/tree");

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center flex flex-col gap-3">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">شجرة العائلة</h1>
        <p className="text-muted max-w-md">
          أرشيف خاص بعائلتك، أنشئ الشجرة وشارك رابط الدعوة مع أفراد عائلتك ليضيفوا ويعدّلوا معك.
        </p>
      </div>

      <div className="w-full flex justify-center">
        <CreateFamilyForm />
      </div>

      <p className="text-sm text-muted">لديك رابط دعوة من أحد أفراد عائلتك؟ افتحه مباشرة للانضمام.</p>
    </main>
  );
}
