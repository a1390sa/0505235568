import type {
  PersonModel as Person,
  UnionModel as Union,
  UnionMemberModel as UnionMember,
  ParentChildModel as ParentChild,
  FamilyModel as Family,
  MemberModel as Member,
} from "@/generated/prisma/models";
import type { PersonInput } from "@/lib/validation";

export type GraphResponse = {
  family: Pick<Family, "id" | "name" | "inviteToken">;
  member: Pick<Member, "id" | "displayName">;
  persons: Person[];
  unions: (Union & { members: UnionMember[] })[];
  parentLinks: ParentChild[];
};

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || "حدث خطأ غير متوقع");
  return body as T;
}

export function fetchGraph() {
  return fetch("/api/graph", { cache: "no-store" }).then((r) => handle<GraphResponse>(r));
}

export type Relation = "father" | "mother" | "spouse" | "child";

export function createPerson(person: PersonInput, relation?: Relation, anchorPersonId?: string) {
  return fetch("/api/persons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person, relation, anchorPersonId }),
  }).then((r) => handle<{ person: Person }>(r));
}

export function updatePerson(id: string, person: PersonInput) {
  return fetch(`/api/persons/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(person),
  }).then((r) => handle<{ person: Person }>(r));
}

export function deletePerson(id: string) {
  return fetch(`/api/persons/${id}`, { method: "DELETE" }).then((r) => handle<{ ok: true }>(r));
}

export function linkParentChild(parentId: string, childId: string) {
  return fetch("/api/parent-child", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId, childId }),
  }).then((r) => handle<{ link: ParentChild }>(r));
}

export function unlinkParentChild(id: string) {
  return fetch("/api/parent-child", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).then((r) => handle<{ ok: true }>(r));
}

export function linkUnion(personAId: string, personBId: string) {
  return fetch("/api/unions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personAId, personBId }),
  }).then((r) => handle<{ union: Union & { members: UnionMember[] } }>(r));
}

export function unlinkUnion(id: string) {
  return fetch("/api/unions", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).then((r) => handle<{ ok: true }>(r));
}
