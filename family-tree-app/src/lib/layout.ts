import type { PersonModel as Person, ParentChildModel as ParentChild } from "@/generated/prisma/models";

export const CARD_WIDTH = 150;
export const CARD_HEIGHT = 190;
export const COL_WIDTH = CARD_WIDTH + 40;
export const ROW_HEIGHT = CARD_HEIGHT + 90;

export type LaidOutPerson = Person & { generation: number; x: number; y: number };
export type LaidOutEdge = { id: string; points: { x: number; y: number }[] };

export type FamilyLayout = {
  persons: LaidOutPerson[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
};

// `person.createdAt` is a real Date when it comes straight from Prisma (the
// initial server-rendered graph), but becomes an ISO string once the graph
// has been round-tripped through the JSON API (e.g. after refresh() runs
// following an add/edit). `new Date(...)` normalizes either case.
function createdAtMs(person: Person): number {
  return new Date(person.createdAt).getTime();
}

// The display tree follows the paternal line only, per family-tree (نسب)
// convention: a person's children are only shown descending from them when
// that person is male. A daughter's own children belong to their father's
// line, not hers, so they never appear as her descendants here — they show
// up instead under their actual father if he's recorded in this family, or
// not at all in the tree view (though still visible in the full data page).
// Wives/spouses never appear as their own nodes in this tree.
export type PatriNode = { person: Person; children: PatriNode[] };

export function buildPatrilinealForest(
  persons: Person[],
  parentLinks: ParentChild[],
  unions: { members: { personId: string }[] }[]
): PatriNode[] {
  const personById = new Map(persons.map((p) => [p.id, p]));

  const childrenByFather = new Map<string, string[]>();
  for (const link of parentLinks) {
    const parent = personById.get(link.parentId);
    if (parent?.gender !== "MALE") continue;
    if (!personById.has(link.childId)) continue;
    if (!childrenByFather.has(link.parentId)) childrenByFather.set(link.parentId, []);
    childrenByFather.get(link.parentId)!.push(link.childId);
  }
  for (const ids of childrenByFather.values()) {
    ids.sort((a, b) => createdAtMs(personById.get(a)!) - createdAtMs(personById.get(b)!));
  }

  const hasParent = new Set<string>();
  for (const link of parentLinks) {
    if (personById.has(link.parentId) && personById.has(link.childId)) hasParent.add(link.childId);
  }

  // Group everyone into connected components via BOTH blood (parent-child)
  // and marriage (union) links, then pick a single root per component —
  // preferring the earliest-recorded male with no parent of his own. This
  // is what keeps a wife (who married in and has no recorded parents) from
  // becoming her own disconnected root: she and her husband end up in the
  // same component, and he wins the root by being male.
  const setOf = new Map<string, string>();
  for (const p of persons) setOf.set(p.id, p.id);
  function find(x: string): string {
    while (setOf.get(x) !== x) {
      setOf.set(x, setOf.get(setOf.get(x)!)!);
      x = setOf.get(x)!;
    }
    return x;
  }
  function joinSets(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) setOf.set(ra, rb);
  }
  for (const link of parentLinks) {
    if (personById.has(link.parentId) && personById.has(link.childId)) joinSets(link.parentId, link.childId);
  }
  for (const u of unions) {
    const ids = u.members.map((m) => m.personId).filter((id) => personById.has(id));
    for (let i = 1; i < ids.length; i++) joinSets(ids[0], ids[i]);
  }

  const componentMembers = new Map<string, string[]>();
  for (const p of persons) {
    const root = find(p.id);
    if (!componentMembers.has(root)) componentMembers.set(root, []);
    componentMembers.get(root)!.push(p.id);
  }

  const roots: Person[] = [];
  for (const memberIds of componentMembers.values()) {
    const noParentIds = memberIds.filter((id) => !hasParent.has(id));
    const candidates = noParentIds.length > 0 ? noParentIds : memberIds;
    const maleCandidates = candidates.filter((id) => personById.get(id)!.gender === "MALE");
    const pool = maleCandidates.length > 0 ? maleCandidates : candidates;
    const chosenId = pool.reduce((best, id) => (createdAtMs(personById.get(id)!) < createdAtMs(personById.get(best)!) ? id : best));
    roots.push(personById.get(chosenId)!);
  }
  roots.sort((a, b) => createdAtMs(a) - createdAtMs(b));

  function build(personId: string): PatriNode {
    const childIds = childrenByFather.get(personId) ?? [];
    return { person: personById.get(personId)!, children: childIds.map(build) };
  }

  return roots.map((r) => build(r.id));
}

/** Lays out one or more patrilineal trees side by side, generation-per-row. */
export function layoutForest(forest: PatriNode[]): FamilyLayout {
  const laidOutPersons: LaidOutPerson[] = [];
  let cursor = 0;

  function place(node: PatriNode, depth: number): number {
    let slot: number;
    if (node.children.length === 0) {
      slot = cursor++;
    } else {
      const childSlots = node.children.map((c) => place(c, depth + 1));
      slot = (Math.min(...childSlots) + Math.max(...childSlots)) / 2;
    }
    laidOutPersons.push({ ...node.person, generation: depth, x: slot * COL_WIDTH, y: depth * ROW_HEIGHT });
    return slot;
  }

  for (const root of forest) {
    place(root, 0);
    cursor += 1; // gap between separate trees
  }

  if (laidOutPersons.length === 0) {
    return { persons: [], edges: [], width: 0, height: 0 };
  }

  const posById = new Map(laidOutPersons.map((p) => [p.id, { x: p.x, y: p.y }]));
  const edges: LaidOutEdge[] = [];

  function addEdges(node: PatriNode) {
    const parentPos = posById.get(node.person.id)!;
    const originX = parentPos.x + CARD_WIDTH / 2;
    const originY = parentPos.y + CARD_HEIGHT;
    for (const child of node.children) {
      const childPos = posById.get(child.person.id)!;
      const childTopX = childPos.x + CARD_WIDTH / 2;
      const midY = originY + (childPos.y - originY) / 2;
      edges.push({
        id: `edge-${node.person.id}-${child.person.id}`,
        points: [
          { x: originX, y: originY },
          { x: originX, y: midY },
          { x: childTopX, y: midY },
          { x: childTopX, y: childPos.y },
        ],
      });
      addEdges(child);
    }
  }
  for (const root of forest) addEdges(root);

  const maxX = Math.max(...laidOutPersons.map((p) => p.x)) + CARD_WIDTH;
  const maxY = Math.max(...laidOutPersons.map((p) => p.y)) + CARD_HEIGHT;
  return { persons: laidOutPersons, edges, width: maxX + COL_WIDTH, height: maxY + ROW_HEIGHT };
}

// --- Print pagination -------------------------------------------------
//
// Each printed page must contain at minimum one father with his direct
// children together (never split across pages). When a branch is small
// enough, a page opportunistically extends to grandchildren (up to
// MAX_PAGE_DEPTH generations) instead of always splitting per child.

const MAX_PAGE_DEPTH = 3; // father + children + grandchildren
const MAX_PAGE_LEAVES = 14; // cap so a single page doesn't get unreadably wide

function countLeaves(node: PatriNode, depth: number, maxDepth: number): number {
  if (depth >= maxDepth || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c, depth + 1, maxDepth), 0);
}

/** Splits a forest into printable pages, each a (possibly truncated) subtree. */
export function buildPrintPages(forest: PatriNode[]): PatriNode[] {
  const pages: PatriNode[] = [];

  function process(node: PatriNode) {
    let chosenDepth = 1;
    for (let d = MAX_PAGE_DEPTH; d >= 1; d--) {
      if (countLeaves(node, 0, d) <= MAX_PAGE_LEAVES) {
        chosenDepth = d;
        break;
      }
    }

    function truncate(n: PatriNode, depth: number): PatriNode {
      if (depth >= chosenDepth) {
        // n's own children didn't fit on this page — n becomes the root of
        // its own subsequent page(s), not its children directly.
        if (n.children.length > 0) process(n);
        return { person: n.person, children: [] };
      }
      return { person: n.person, children: n.children.map((c) => truncate(c, depth + 1)) };
    }

    pages.push(truncate(node, 0));
  }

  for (const root of forest) process(root);
  return pages;
}
