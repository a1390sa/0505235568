"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { FamilyLayout } from "@/lib/layout";
import { CARD_WIDTH, CARD_HEIGHT } from "@/lib/layout";
import { PersonCard } from "./PersonCard";

export type TreeCanvasHandle = {
  centerOnPerson: (personId: string) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 1.75;

export const TreeCanvas = forwardRef<
  TreeCanvasHandle,
  {
    layout: FamilyLayout;
    selectedPersonId: string | null;
    highlightedPersonId: string | null;
    onSelectPerson: (id: string) => void;
  }
>(function TreeCanvas({ layout, selectedPersonId, highlightedPersonId, onSelectPerson }, ref) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.85 });
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  useImperativeHandle(ref, () => ({
    centerOnPerson(personId: string) {
      const person = layout.persons.find((p) => p.id === personId);
      const viewport = viewportRef.current;
      if (!person || !viewport) return;
      const rect = viewport.getBoundingClientRect();
      setTransform((t) => ({
        ...t,
        x: rect.width / 2 - (person.x + CARD_WIDTH / 2) * t.scale,
        y: rect.height / 2 - (person.y + CARD_HEIGHT / 2) * t.scale,
      }));
    },
    zoomIn() {
      setTransform((t) => ({ ...t, scale: clampScale(t.scale + 0.15) }));
    },
    zoomOut() {
      setTransform((t) => ({ ...t, scale: clampScale(t.scale - 0.15) }));
    },
    reset() {
      setTransform({ x: 40, y: 40, scale: 0.85 });
    },
  }));

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: transform.x, originY: transform.y };
  }, [transform.x, transform.y]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setTransform((t) => ({ ...t, x: dragState.current!.originX + dx, y: dragState.current!.originY + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  // React attaches its synthetic `onWheel` as a passive listener, so calling
  // preventDefault() on it throws "Unable to preventDefault inside passive
  // event listener invocation" on every tick — it doesn't stop working, but
  // it floods the console and burns the main thread badly enough to make
  // scrolling/zooming feel like the page hung. A native listener registered
  // with { passive: false } is required to actually cancel page scroll.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      setTransform((t) => {
        const nextScale = clampScale(t.scale * (e.deltaY < 0 ? 1.08 : 0.92));
        const worldX = (cursorX - t.x) / t.scale;
        const worldY = (cursorY - t.y) / t.scale;
        return {
          scale: nextScale,
          x: cursorX - worldX * nextScale,
          y: cursorY - worldY * nextScale,
        };
      });
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={viewportRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      className="relative w-full h-full overflow-hidden bg-background touch-none select-none cursor-grab active:cursor-grabbing print:static print:h-auto print:w-auto print:overflow-visible"
      style={{
        backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {layout.persons.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted print:hidden">
          لا يوجد أفراد بعد — ابدأ بإضافة أول شخص في الشجرة
        </div>
      ) : (
        <div
          dir="ltr"
          className="absolute top-0 left-0 origin-top-left print:hidden"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            width: layout.width,
            height: layout.height,
          }}
        >
          <svg width={layout.width} height={layout.height} className="absolute top-0 left-0 pointer-events-none overflow-visible">
            {layout.edges.map((edge) => (
              <polyline
                key={edge.id}
                points={edge.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={edge.kind === "couple" ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {layout.persons.map((person) => (
            <div
              key={person.id}
              dir="rtl"
              className="absolute"
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                left: person.x,
                top: person.y,
              }}
            >
              <PersonCard
                person={person}
                selected={selectedPersonId === person.id}
                highlighted={highlightedPersonId === person.id}
                onClick={() => onSelectPerson(person.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Print-only: the same layout at natural size with no pan/zoom
          transform, so the browser's print engine can paginate it and the
          "fit to page" print option scales it down as needed. */}
      {layout.persons.length > 0 && (
        <div
          dir="ltr"
          className="hidden print:block relative"
          style={{ width: layout.width, height: layout.height }}
        >
          <svg width={layout.width} height={layout.height} className="absolute top-0 left-0 overflow-visible">
            {layout.edges.map((edge) => (
              <polyline
                key={edge.id}
                points={edge.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={edge.kind === "couple" ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          {layout.persons.map((person) => (
            <div
              key={person.id}
              dir="rtl"
              className="absolute"
              style={{
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                left: person.x,
                top: person.y,
              }}
            >
              <PersonCard person={person} selected={false} highlighted={false} onClick={() => {}} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
