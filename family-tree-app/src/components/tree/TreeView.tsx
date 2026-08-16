"use client";

import { useMemo, useRef, useState } from "react";
import type { PersonModel as Person } from "@/generated/prisma/models";
import { computeLayout } from "@/lib/layout";
import type { PersonInput } from "@/lib/validation";
import * as api from "@/lib/api-client";
import type { GraphResponse, Relation } from "@/lib/api-client";
import { TopBar } from "./TopBar";
import { TreeCanvas, type TreeCanvasHandle } from "./TreeCanvas";
import { PersonDrawer } from "./PersonDrawer";
import { PersonFormModal } from "./PersonFormModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { fullName } from "@/lib/person-display";

type ModalState =
  | { type: "create"; relation?: Relation; anchorId?: string }
  | { type: "edit"; person: Person }
  | null;

export function TreeView({ initialGraph }: { initialGraph: GraphResponse }) {
  const [graph, setGraph] = useState(initialGraph);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [highlightedPersonId, setHighlightedPersonId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<TreeCanvasHandle>(null);

  const layout = useMemo(
    () => computeLayout(graph.persons, graph.unions, graph.parentLinks),
    [graph.persons, graph.unions, graph.parentLinks]
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

  async function handleFormSubmit(data: PersonInput) {
    if (modal?.type === "edit") {
      await api.updatePerson(modal.person.id, data);
    } else if (modal?.type === "create") {
      await api.createPerson(data, modal.relation, modal.anchorId);
    }
    setModal(null);
    await refresh();
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
  const spousesOfSelected = selectedPerson
    ? graph.unions
        .filter((u) => u.members.some((m) => m.personId === selectedPerson.id))
        .flatMap((u) => u.members.filter((m) => m.personId !== selectedPerson.id).map((m) => graph.persons.find((p) => p.id === m.personId)))
        .filter(Boolean as unknown as (p: Person | undefined) => p is Person)
    : [];

  return (
    <div className="flex flex-col h-dvh">
      <TopBar
        familyName={graph.family.name}
        inviteToken={graph.family.inviteToken}
        memberName={graph.member.displayName}
        persons={graph.persons}
        onSelectPerson={handleSearchSelect}
        onAddPerson={() => setModal({ type: "create" })}
      />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline">
            إغلاق
          </button>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <TreeCanvas
          ref={canvasRef}
          layout={layout}
          selectedPersonId={selectedPersonId}
          highlightedPersonId={highlightedPersonId}
          onSelectPerson={selectPerson}
        />

        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
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
          anchorName={
            modal.type === "create" && modal.anchorId
              ? fullName(graph.persons.find((p) => p.id === modal.anchorId)!)
              : undefined
          }
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
    </div>
  );
}
