"use client";

import { useState } from "react";
import type { PersonModel as Person } from "@/generated/prisma/models";
import type { Relation } from "@/lib/api-client";
import type { PersonInput } from "@/lib/validation";
import { resizeImageFile } from "@/lib/image";
import { fullName } from "@/lib/person-display";
import { HijriDateField } from "./HijriDateField";

const RELATION_LABEL: Record<Relation, string> = {
  father: "إضافة أب",
  mother: "إضافة أم",
  spouse: "إضافة زوج/زوجة",
  child: "إضافة ابن/ابنة",
};

export function PersonFormModal({
  mode,
  existingPerson,
  relation,
  anchorName,
  initialLastName,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  existingPerson?: Person;
  relation?: Relation;
  anchorName?: string;
  initialLastName?: string;
  onCancel: () => void;
  onSubmit: (data: PersonInput) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(existingPerson?.firstName ?? "");
  const [lastName, setLastName] = useState(existingPerson?.lastName ?? initialLastName ?? "");
  const [gender, setGender] = useState(existingPerson?.gender ?? "UNKNOWN");
  const [birthDate, setBirthDate] = useState(existingPerson?.birthDate ?? "");
  const [isAlive, setIsAlive] = useState(existingPerson?.isAlive ?? true);
  const [deathDate, setDeathDate] = useState(existingPerson?.deathDate ?? "");
  const [notes, setNotes] = useState(existingPerson?.notes ?? "");
  const [photo, setPhoto] = useState<string | undefined>(existingPerson?.photo ?? undefined);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const title =
    mode === "edit"
      ? `تعديل بيانات ${existingPerson ? fullName(existingPerson) : ""}`
      : relation
        ? `${RELATION_LABEL[relation]} لـ${anchorName ?? ""}`
        : "إضافة شخص جديد";

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setPhoto(dataUrl);
    } catch {
      setError("تعذر معالجة الصورة، جرّب صورة أخرى");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("الاسم الأول مطلوب");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit({
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        gender: gender as Person["gender"],
        birthDate: birthDate.trim() || undefined,
        deathDate: !isAlive ? deathDate.trim() || undefined : undefined,
        isAlive,
        photo,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden" onClick={onCancel}>
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground mb-4">{title}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <label className="w-16 h-16 rounded-full overflow-hidden bg-neutral-100 border border-border flex items-center justify-center shrink-0 cursor-pointer">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted">صورة</span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            {photo && (
              <button type="button" onClick={() => setPhoto(undefined)} className="text-sm text-muted underline">
                إزالة الصورة
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">الاسم الأول</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">اسم العائلة</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              />
              {mode === "create" && initialLastName && lastName === initialLastName && (
                <p className="text-xs text-muted">تم تعبئته تلقائياً من {anchorName}، يمكنك تعديله</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">الجنس</label>
            <div className="flex gap-2">
              {[
                { v: "MALE", l: "ذكر" },
                { v: "FEMALE", l: "أنثى" },
                { v: "UNKNOWN", l: "غير محدد" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.v}
                  onClick={() => setGender(opt.v as typeof gender)}
                  className={[
                    "flex-1 rounded-lg border px-3 py-2 text-sm",
                    gender === opt.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted",
                  ].join(" ")}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <HijriDateField label="تاريخ الميلاد" value={birthDate} onChange={setBirthDate} />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!isAlive} onChange={(e) => setIsAlive(!e.target.checked)} />
            متوفى
          </label>

          {!isAlive && (
            <HijriDateField label="تاريخ الوفاة" value={deathDate} onChange={setDeathDate} />
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">ملاحظات</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {pending ? "جارٍ الحفظ..." : "حفظ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
