import type {
  PersonModel as Person,
  UnionModel as Union,
  UnionMemberModel as UnionMember,
  ParentChildModel as ParentChild,
} from "@/generated/prisma/models";

export type UnionWithMembers = Union & { members: UnionMember[] };

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 190;
export const COL_WIDTH = CARD_WIDTH + 40;
export const ROW_HEIGHT = CARD_HEIGHT + 90;
export const COUPLE_LINK_GAP = 14;

export type LaidOutPerson = Person & { generation: number; x: number; y: number };
export type LaidOutUnion = { id: string; x: number; y: number; personIds: string[] };
export type LaidOutEdge = { id: string; kind: "parent" | "couple"; points: { x: number; y: number }[] };

export type FamilyLayout = {
  persons: LaidOutPerson[];
  unions: LaidOutUnion[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
};

/**
 * Lays out a family DAG (people, unions/marriages, parent-child links) into
 * a top-down pedigree grid: each generation is a row, spouses sit side by
 * side, and children are ordered under the average x of their parents'
 * union (a simple barycenter pass — good enough for a few hundred nodes).
 */
export function computeLayout(
  persons: Person[],
  unions: UnionWithMembers[],
  parentLinks: ParentChild[]
): FamilyLayout {
  if (persons.length === 0) {
    return { persons: [], unions: [], edges: [], width: 0, height: 0 };
  }

  const personById = new Map(persons.map((p) => [p.id, p]));
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const pl of parentLinks) {
    if (!personById.has(pl.parentId) || !personById.has(pl.childId)) continue;
    if (!parentsOf.has(pl.childId)) parentsOf.set(pl.childId, []);
    parentsOf.get(pl.childId)!.push(pl.parentId);
    if (!childrenOf.has(pl.parentId)) childrenOf.set(pl.parentId, []);
    childrenOf.get(pl.parentId)!.push(pl.childId);
  }

  // 1) Generation assignment via fixed-point relaxation, alternating
  // "child below parent" and "spouses share a generation" until stable.
  const generation = new Map<string, number>();
  for (const p of persons) generation.set(p.id, 0);

  for (let pass = 0; pass < persons.length + 3; pass++) {
    let changed = false;

    for (const pl of parentLinks) {
      const pg = generation.get(pl.parentId) ?? 0;
      const cg = generation.get(pl.childId) ?? 0;
      if (cg < pg + 1) {
        generation.set(pl.childId, pg + 1);
        changed = true;
      }
    }

    for (const u of unions) {
      const ids = u.members.map((m) => m.personId).filter((id) => personById.has(id));
      if (ids.length < 2) continue;
      const maxGen = Math.max(...ids.map((id) => generation.get(id) ?? 0));
      for (const id of ids) {
        if ((generation.get(id) ?? 0) < maxGen) {
          generation.set(id, maxGen);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  // 2) Group people into layout "units": a couple (union) is one unit that
  // stays together; everyone else is a lone unit.
  type Unit = { id: string; personIds: string[]; generation: number };
  const units: Unit[] = [];
  const placedPerson = new Set<string>();
  const unitOfPerson = new Map<string, string>();

  for (const u of unions) {
    const ids = u.members.map((m) => m.personId).filter((id) => personById.has(id) && !placedPerson.has(id));
    if (ids.length === 0) continue;
    const unitId = `u-${u.id}`;
    const gen = Math.max(...ids.map((id) => generation.get(id) ?? 0));
    units.push({ id: unitId, personIds: ids, generation: gen });
    for (const id of ids) {
      placedPerson.add(id);
      unitOfPerson.set(id, unitId);
    }
  }
  for (const p of persons) {
    if (placedPerson.has(p.id)) continue;
    const unitId = `p-${p.id}`;
    units.push({ id: unitId, personIds: [p.id], generation: generation.get(p.id) ?? 0 });
    placedPerson.add(p.id);
    unitOfPerson.set(p.id, unitId);
  }

  const byGeneration = new Map<number, Unit[]>();
  for (const u of units) {
    if (!byGeneration.has(u.generation)) byGeneration.set(u.generation, []);
    byGeneration.get(u.generation)!.push(u);
  }
  const generations = [...byGeneration.keys()].sort((a, b) => a - b);

  // 3) Order each row left-to-right: row 0 by creation order, later rows by
  // the average x of each unit's parent unit(s) (barycenter heuristic).
  const unitCenterSlot = new Map<string, number>();

  for (const gen of generations) {
    const row = byGeneration.get(gen)!;
    let ordered: Unit[];

    if (gen === generations[0]) {
      ordered = [...row].sort(
        (a, b) => personById.get(a.personIds[0])!.createdAt.getTime() - personById.get(b.personIds[0])!.createdAt.getTime()
      );
    } else {
      const scoreOf = (u: Unit) => {
        const parentSlots: number[] = [];
        for (const pid of u.personIds) {
          for (const parentId of parentsOf.get(pid) ?? []) {
            const parentUnit = unitOfPerson.get(parentId);
            if (parentUnit && unitCenterSlot.has(parentUnit)) parentSlots.push(unitCenterSlot.get(parentUnit)!);
          }
        }
        if (parentSlots.length === 0) return Number.POSITIVE_INFINITY;
        return parentSlots.reduce((a, b) => a + b, 0) / parentSlots.length;
      };
      ordered = [...row].sort((a, b) => {
        const sa = scoreOf(a);
        const sb = scoreOf(b);
        if (sa !== sb) return sa - sb;
        return personById.get(a.personIds[0])!.createdAt.getTime() - personById.get(b.personIds[0])!.createdAt.getTime();
      });
    }

    let cursor = 0;
    for (const u of ordered) {
      const width = u.personIds.length;
      unitCenterSlot.set(u.id, cursor + (width - 1) / 2);
      cursor += width;
    }
  }

  // 4) Convert slots to pixel positions.
  const laidOutPersons: LaidOutPerson[] = [];
  for (const gen of generations) {
    for (const u of byGeneration.get(gen)!) {
      const baseSlot = unitCenterSlot.get(u.id)! - (u.personIds.length - 1) / 2;
      u.personIds.forEach((pid, idx) => {
        const p = personById.get(pid)!;
        laidOutPersons.push({
          ...p,
          generation: gen,
          x: (baseSlot + idx) * COL_WIDTH,
          y: gen * ROW_HEIGHT,
        });
      });
    }
  }
  const posById = new Map(laidOutPersons.map((p) => [p.id, { x: p.x, y: p.y }]));

  const laidOutUnions: LaidOutUnion[] = units
    .filter((u) => u.personIds.length > 1)
    .map((u) => {
      const xs = u.personIds.map((pid) => posById.get(pid)!.x);
      return {
        id: u.id,
        x: (Math.min(...xs) + Math.max(...xs)) / 2 + CARD_WIDTH / 2,
        y: posById.get(u.personIds[0])!.y + CARD_HEIGHT / 2,
        personIds: u.personIds,
      };
    });

  // 5) Edges: couple links between adjacent spouse cards, and elbow
  // connectors from each parent (or their union midpoint) down to each child.
  const edges: LaidOutEdge[] = [];

  for (const u of laidOutUnions) {
    const [aId, bId] = u.personIds;
    if (!bId) continue;
    const a = posById.get(aId)!;
    const b = posById.get(bId)!;
    const y = a.y + CARD_HEIGHT / 2;
    edges.push({
      id: `couple-${u.id}`,
      kind: "couple",
      points: [
        { x: a.x + CARD_WIDTH, y },
        { x: b.x, y },
      ],
    });
  }

  const connectorOrigin = (personId: string) => {
    const pos = posById.get(personId)!;
    const unionId = unitOfPerson.get(personId);
    const union = unionId ? laidOutUnions.find((u) => u.id === unionId) : undefined;
    if (union) return { x: union.x, y: union.y };
    return { x: pos.x + CARD_WIDTH / 2, y: pos.y + CARD_HEIGHT / 2 };
  };

  for (const [childId, parents] of parentsOf) {
    const child = posById.get(childId);
    if (!child) continue;
    const childTop = { x: child.x + CARD_WIDTH / 2, y: child.y };

    // If both recorded parents share a union, draw a single line from it.
    const uniqueOrigins = new Map<string, { x: number; y: number }>();
    for (const parentId of parents) {
      const origin = connectorOrigin(parentId);
      uniqueOrigins.set(`${origin.x},${origin.y}`, origin);
    }

    let idx = 0;
    for (const origin of uniqueOrigins.values()) {
      const midY = origin.y + (childTop.y - origin.y) / 2;
      edges.push({
        id: `parent-${childId}-${idx++}`,
        kind: "parent",
        points: [
          { x: origin.x, y: origin.y },
          { x: origin.x, y: midY },
          { x: childTop.x, y: midY },
          { x: childTop.x, y: childTop.y },
        ],
      });
    }
  }

  const maxX = Math.max(...laidOutPersons.map((p) => p.x)) + CARD_WIDTH;
  const maxY = Math.max(...laidOutPersons.map((p) => p.y)) + CARD_HEIGHT;

  return { persons: laidOutPersons, unions: laidOutUnions, edges, width: maxX + COL_WIDTH, height: maxY + ROW_HEIGHT };
}
