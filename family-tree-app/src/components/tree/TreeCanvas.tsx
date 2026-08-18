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
    printPages: { title: string; layout: FamilyLayout }[];
    selectedPersonId: string | null;
    highlightedPersonId: string | null;
    onSelectPerson: (id: string) => void;
  }
>(function TreeCanvas({ layout, printPages, selectedPersonId, highlightedPersonId, onSelectPerson }, ref) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 40, y: 40, scale: 0.85 });
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  // Tracks every finger currently touching the canvas (by pointerId) and the
  // active gesture built from them: one pointer pans, two pinch-zoom. A
  // second finger landing mid-drag (a pinch attempt) used to be fed straight
  // into the single-pointer pan math with no protection, which could throw
  // the pan/zoom transform to extreme values and crash the tab — especially
  // on mobile. Re-deriving the gesture from the live pointer set on every
  // down/up keeps the transform anchored correctly through the transition.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  type PanGesture = { mode: "pan"; pointerId: number; startX: number; startY: number; originX: number; originY: number };
  type PinchGesture = {
    mode: "pinch";
    idA: number;
    idB: number;
    startDist: number;
    startScale: number;
    startMidX: number;
    startMidY: number;
    originX: number;
    originY: number;
  };
  const gestureRef = useRef<PanGesture | PinchGesture | null>(null);

  const beginGesture = useCallback(() => {
    const ids = [...pointers.current.keys()];
    const t = transformRef.current;
    if (ids.length === 0) {
      gestureRef.current = null;
    } else if (ids.length === 1) {
      const p = pointers.current.get(ids[0])!;
      gestureRef.current = { mode: "pan", pointerId: ids[0], startX: p.x, startY: p.y, originX: t.x, originY: t.y };
    } else {
      const [idA, idB] = ids;
      const a = pointers.current.get(idA)!;
      const b = pointers.current.get(idB)!;
      gestureRef.current = {
        mode: "pinch",
        idA,
        idB,
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startScale: t.scale,
        startMidX: (a.x + b.x) / 2,
        startMidY: (a.y + b.y) / 2,
        originX: t.x,
        originY: t.y,
      };
    }
  }, []);

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

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture(e.pointerId);
      if (pointers.current.size < 2) {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        beginGesture();
      }
    },
    [beginGesture]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const gesture = gestureRef.current;
    if (!gesture) return;

    if (gesture.mode === "pan") {
      if (e.pointerId !== gesture.pointerId) return;
      const dx = e.clientX - gesture.startX;
      const dy = e.clientY - gesture.startY;
      setTransform((t) => ({ ...t, x: gesture.originX + dx, y: gesture.originY + dy }));
      return;
    }

    if (e.pointerId !== gesture.idA && e.pointerId !== gesture.idB) return;
    const a = pointers.current.get(gesture.idA);
    const b = pointers.current.get(gesture.idB);
    const viewport = viewportRef.current;
    if (!a || !b || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, gesture.startScale * (dist / gesture.startDist)));
    const anchorX = gesture.startMidX - rect.left;
    const anchorY = gesture.startMidY - rect.top;
    const worldX = (anchorX - gesture.originX) / gesture.startScale;
    const worldY = (anchorY - gesture.originY) / gesture.startScale;
    const midX = (a.x + b.x) / 2 - rect.left;
    const midY = (a.y + b.y) / 2 - rect.top;
    setTransform({ scale: nextScale, x: midX - worldX * nextScale, y: midY - worldY * nextScale });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      pointers.current.delete(e.pointerId);
      beginGesture();
    },
    [beginGesture]
  );

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
      onPointerCancel={onPointerUp}
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
                strokeWidth={2}
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

      {/* Print-only: each entry is one father-and-his-descendants branch,
          laid out at natural size with no pan/zoom transform and forced
          onto its own printed page, so a large tree splits into readable
          per-branch pages instead of one page for the whole family. */}
      {printPages.map((page, i) => (
        <div key={i} dir="ltr" className="hidden print:block" style={{ breakAfter: "page" }}>
          <h3 className="text-center font-bold py-2">{page.title}</h3>
          <div className="relative" style={{ width: page.layout.width, height: page.layout.height }}>
            <svg
              width={page.layout.width}
              height={page.layout.height}
              className="absolute top-0 left-0 overflow-visible"
            >
              {page.layout.edges.map((edge) => (
                <polyline
                  key={edge.id}
                  points={edge.points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>

            {page.layout.persons.map((person) => (
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
        </div>
      ))}
    </div>
  );
});
