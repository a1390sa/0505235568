import type { Gender } from "@/generated/prisma/enums";

export type PersonInput = {
  firstName: string;
  lastName?: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  isAlive: boolean;
  photo?: string;
  notes?: string;
};

const GENDERS = new Set(["MALE", "FEMALE", "UNKNOWN"]);

export function sanitizePersonInput(body: unknown): { data?: PersonInput; error?: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const firstName = String(b.firstName ?? "").trim();
  if (!firstName) return { error: "الاسم الأول مطلوب" };
  if (firstName.length > 100) return { error: "الاسم طويل جداً" };

  const lastNameRaw = typeof b.lastName === "string" ? b.lastName.trim() : "";
  const lastName = lastNameRaw ? lastNameRaw.slice(0, 100) : undefined;

  const gender = GENDERS.has(String(b.gender)) ? (b.gender as Gender) : "UNKNOWN";

  const birthDate = typeof b.birthDate === "string" && b.birthDate.trim() ? b.birthDate.trim().slice(0, 50) : undefined;
  const deathDate = typeof b.deathDate === "string" && b.deathDate.trim() ? b.deathDate.trim().slice(0, 50) : undefined;
  const isAlive = typeof b.isAlive === "boolean" ? b.isAlive : !deathDate;

  const notesRaw = typeof b.notes === "string" ? b.notes.trim() : "";
  const notes = notesRaw ? notesRaw.slice(0, 2000) : undefined;

  let photo: string | undefined;
  if (typeof b.photo === "string" && b.photo.length > 0) {
    if (!b.photo.startsWith("data:image/")) return { error: "صيغة الصورة غير صالحة" };
    if (b.photo.length > 1_500_000) return { error: "حجم الصورة كبير جداً" };
    photo = b.photo;
  }

  return { data: { firstName, lastName, gender, birthDate, deathDate, isAlive, photo, notes } };
}
