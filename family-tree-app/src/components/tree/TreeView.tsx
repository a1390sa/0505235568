"use client";

import { useMemo, useRef, useState } from "react";
import type { PersonModel as Person } from "@/generated/prisma/models";
import { buildPatrilinealForest, layoutForest, buildPrintPages } from "@/lib/layout";
import type { PersonInput } from "@/lib/validation";
import * as api from "@/lib/api-client";
import type { GraphResponse, Relation } from "@/lib/api-client";
import { TopBar } from "./TopBar";
import { TreeCanvas, type TreeCanvasHandle } from "./TreeCanvas";
import { PersonDrawer } from "./PersonDrawer";
import { PersonFormModal } from "./PersonFormModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { LinkParentDialog } from "./LinkParentDialog";
import { LinkChildrenDialog } from "./LinkChildrenDialog";
import { fullName } from "@/lib/person-display";
import { suggestLastName } from "@/lib/relations";

type ModalState =
  | { type: "create"; relation?: Relation; anchorId?: string }
  | { type: "edit"; person: Person }
  | null;

type LinkParentPrompt = {
  childId: string;
  childName: string;
  anchorName: string;
  candidates: Person[];
};

type LinkChildrenPrompt = {
  spouseId: string;
  spouseName: string;
  anchorName: string;
  candidates: Person[];
};

export function TreeView({ initialGraph }: { initialGraph: GraphResponse }) {
  const [graph, setGraph] = useState(initialGraph);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [linkParentPrompt, setLinkParentPrompt] = useState<LinkParentPrompt | null>(null);
  const [linkChildrenPrompt, setLinkChildrenPrompt] = useState<LinkChildrenPrompt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<TreeCanvasHandle>(null);

  const forest = useMemo(
    () => buildPatrilinealForest(graph.persons, graph.parentLinks, graph.unions),
    [graph.persons, graph.parentLinks, graph.unions]
  );
  const layout = useMemo(() => layoutForest(forest), [forest]);
  const printPages = useMemo(
    () =>
      buildPrintPages(forest).map((page) => ({
        title: `${graph.family.name} — فرع ${fullName(page.person)}`,
        layout: layoutForest([page]),
      })),
    [forest, graph.family.name]
  );

  const selectedPerson = graph.persons.find((p) => p.id === selectedPersonId) ?? null;

  async function refresh() {
    try {
      const fresh = await api.fetchGraph();
      setGraph(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحديث البيانات");
    }
  }

  function selectPerson(id: string) {
    setSelectedPersonId(id);
    // Re-center so the drawer (which overlaps the left side of the canvas)
    // never hides the card the user just selected.
    canvasRef.current?.centerOnPerson(id);
  }

  function handleSearchSelect(id: string) {
    selectPerson(id);
    setHighlightedPersonId(id);
    setTimeout(() => setHighlightedPersonId((cur) => (cur === id ? null : cur)), 1600);
  }

  function spousesOf(personId: string): Person[] {
    return graph.unions
      .filter((u) => u.members.some((m) => m.personId === personId))
      .flatMap((u) => u.members.filter((m) => m.personId !== personId).map((m) => graph.persons.find((p) => p.id === m.personId)))
      .filter(Boolean as unknown as (p: Person | undefined) => p is Person);
  }

  // Children of this person who only have one recorded parent so far — the
  // ones a newly-added spouse could plausibly also be a parent of.
  function childrenMissingSecondParent(personId: string): Person[] {
    return graph.parentLinks
      .filter((pl) => pl.parentId === personId)
      .map((pl) => pl.childId)
      .filter((childId) => graph.parentLinks.filter((pl) => pl.childId === childId).length < 2)
      .map((childId) => graph.persons.find((p) => p.id === childId))
      .filter(Boolean as unknown as (p: Person | undefined) => p is Person);
  }

  async function handleFormSubmit(data: PersonInput) {
    if (modal?.type === "edit") {
      await api.updatePerson(modal.person.id, data);
      setModal(null);
      await refresh();
      return;
    }
    if (modal?.type !== "create") return;

    const { relation, anchorId } = modal;
    const anchor = anchorId ? graph.persons.find((p) => p.id === anchorId) : undefined;
    const anchorSpouses = anchorId ? spousesOf(anchorId) : [];
    const anchorChildrenMissingParent = anchorId ? childrenMissingSecondParent(anchorId) : [];

    const { person: created } = await api.createPerson(data, relation, anchorId);
    setModal(null);
    await refresh();

    if (relation === "child" && anchor && anchorSpouses.length > 0) {
      setLinkParentPrompt({
        childId: created.id,
        childName: fullName(created),
        anchorName: fullName(anchor),
        candidates: anchorSpouses,
      });
    } else if (relation === "spouse" && anchor && anchorChildrenMissingParent.length > 0) {
      setLinkChildrenPrompt({
        spouseId: created.id,
        spouseName: fullName(created),
        anchorName: fullName(anchor),
        candidates: anchorChildrenMissingParent,
      });
    }
  }

  async function handleLinkChildren(childIds: string[]) {
    if (!linkChildrenPrompt) return;
    try {
      await Promise.all(childIds.map((childId) => api.linkParentChild(linkChildrenPrompt.spouseId, childId)));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الربط");
    } finally {
      setLinkChildrenPrompt(null);
    }
  }

  async function handleLinkOtherParent(parentId: string) {
    if (!linkParentPrompt) return;
    try {
      await api.linkParentChild(parentId, linkParentPrompt.childId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الربط");
    } finally {
      setLinkParentPrompt(null);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteId) return;
    try {
      await api.deletePerson(confirmDeleteId);
      setConfirmDeleteId(null);
      setSelectedPersonId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحذف");
    }
  }

  const parentsOfSelected = selectedPerson
    ? graph.parentLinks.filter((pl) => pl.childId === selectedPerson.id).map((pl) => graph.persons.find((p) => p.id === pl.parentId)).filter(Boolean as unknown as (p: Person | undefined) => p is Person)
    : [];
  const childrenOfSelected = selectedPerson
    ? graph.parentLinks.filter((pl) => pl.parentId === selectedPerson.id).map((pl) => graph.persons.find((p) => p.id === pl.childId)).filter(Boolean as unknown as (p: Person | undefined) => p is Person)
    : [];
  const spousesOfSelected = selectedPerson ? spousesOf(selectedPerson.id) : [];
  // Siblings are never stored directly — they fall out automatically from
  // sharing at least one recorded parent, so this list is always in sync.
  const siblingsOfSelected = selectedPerson
    ? graph.persons.filter(
        (p) =>
          p.id !== selectedPerson.id &&
          graph.parentLinks.some(
            (pl) => pl.childId === p.id && parentsOfSelected.some((parent) => parent.id === pl.parentId)
          )
      )
    : [];

  const modalAnchor = modal?.type === "create" && modal.anchorId ? graph.persons.find((p) => p.id === modal.anchorId) : undefined;
  const modalAnchorSpouses = modalAnchor ? spousesOf(modalAnchor.id) : [];
  const modalInitialLastName =
    modal?.type === "create" ? suggestLastName(modal.relation, modalAnchor, modalAnchorSpouses) : undefined;

  return (
    <div className="flex flex-col h-dvh print:block print:h-auto">
      <TopBar
        familyName={graph.family.name}
        inviteToken={graph.family.inviteToken}
        memberName={graph.member.displayName}
        persons={graph.persons}
        onSelectPerson={handleSearchSelect}
        onAddPerson={() => setModal({ type: "create" })}
        onPrint={() => window.print()}
      />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm text-center py-2 px-4 flex items-center justify-center gap-3 print:hidden">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">
            إغلاق
          </button>
        </div>
      )}

      <div className="relative flex-1 min-h-0 print:static print:h-auto">
        <TreeCanvas
          ref={canvasRef}
          layout={layout}
          printPages={printPages}
          selectedPersonId={selectedPersonId}
          highlightedPersonId={highlightedPersonId}
          onSelectPerson={selectPerson}
        />

        <div className="absolute bottom-4 left-4 flex flex-col gap-2 print:hidden">
          <button
            onClick={() => canvasRef.current?.zoomIn()}
            className="w-10 h-10 rounded-full bg-surface border border-border shadow flex items-center justify-center text-lg"
            aria-label="تكبير"
          >
            +
          </button>
          <button
            onClick={() => canvasRef.current?.zoomOut()}
            className="w-10 h-10 rounded-full bg-surface border border-border shadow flex items-center justify-center text-lg"
            aria-label="تصغير"
          >
            −
          </button>
          <button
            onClick={() => canvasRef.current?.reset()}
            className="w-10 h-10 rounded-full bg-surface border border-border shadow flex items-center justify-center text-xs"
            aria-label="إعادة الضبط"
          >
            ⟳
          </button>
        </div>
      </div>

      {selectedPerson && (
        <PersonDrawer
          person={selectedPerson}
          parents={parentsOfSelected}
          siblings={siblingsOfSelected}
          kids={childrenOfSelected}
          spouses={spousesOfSelected}
          canAddParent={parentsOfSelected.length < 2}
          onClose={() => setSelectedPersonId(null)}
          onEdit={() => setModal({ type: "edit", person: selectedPerson })}
          onDelete={() => setConfirmDeleteId(selectedPerson.id)}
          onAddRelative={(relation) => setModal({ type: "create", relation, anchorId: selectedPerson.id })}
        />
      )}

      {modal && (
        <PersonFormModal
          mode={modal.type}
          existingPerson={modal.type === "edit" ? modal.person : undefined}
          relation={modal.type === "create" ? modal.relation : undefined}
          anchorName={modalAnchor ? fullName(modalAnchor) : undefined}
          initialLastName={modalInitialLastName}
          onCancel={() => setModal(null)}
          onSubmit={handleFormSubmit}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="حذف هذا الشخص؟"
          message="سيتم حذف جميع الروابط المرتبطة به (كوالد أو زوج أو ابن). لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="حذف"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {linkParentPrompt && (
        <LinkParentDialog
          childName={linkParentPrompt.childName}
          anchorName={linkParentPrompt.anchorName}
          candidates={linkParentPrompt.candidates}
          onPick={handleLinkOtherParent}
          onSkip={() => setLinkParentPrompt(null)}
        />
      )}

      {linkChildrenPrompt && (
        <LinkChildrenDialog
          spouseName={linkChildrenPrompt.spouseName}
          anchorName={linkChildrenPrompt.anchorName}
          candidates={linkChildrenPrompt.candidates}
          onConfirm={handleLinkChildren}
          onSkip={() => setLinkChildrenPrompt(null)}
        />
      )}
    </div>
  );
}
