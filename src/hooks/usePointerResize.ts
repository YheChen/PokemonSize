"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/pokemon";

interface DragState {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startHeight: number;
}

export interface UsePointerResizeOptions {
  height: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (height: number) => void;
}

export interface UsePointerResizeResult {
  isDragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
}

/**
 * Diagonal resize from an upper-right handle: dragging right or up grows the
 * figure. Works with mouse, trackpad, touch and stylus through Pointer Events.
 */
export function usePointerResize({
  height,
  min,
  max,
  disabled = false,
  onChange,
}: UsePointerResizeOptions): UsePointerResizeResult {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);

  // Lets an in-flight gesture read the newest bounds and callback without
  // tearing down and re-registering its listeners mid-drag.
  const latest = useRef({ height, min, max, onChange });
  useEffect(() => {
    latest.current = { height, min, max, onChange };
  });

  const stopDragging = useCallback(() => {
    dragRef.current = null;
    pendingRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    setIsDragging(false);
    document.body.classList.remove("pokescale-dragging");
  }, []);

  useEffect(() => stopDragging, [stopDragging]);

  const flush = useCallback(() => {
    frameRef.current = null;
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next === null) return;
    latest.current.onChange(next);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || event.button > 0) return;

      const element = event.currentTarget;
      element.setPointerCapture?.(event.pointerId);

      dragRef.current = {
        pointerId: event.pointerId,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startHeight: latest.current.height,
      };

      setIsDragging(true);
      document.body.classList.add("pokescale-dragging");
      event.preventDefault();
    },
    [disabled],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      const dx = event.clientX - drag.startPointerX;
      const dy = drag.startPointerY - event.clientY;
      // Average the two axes so the figure tracks the diagonal rather than
      // jumping when the pointer wanders off one axis.
      const delta = (dx + dy) / 2;

      pendingRef.current = clamp(
        drag.startHeight + delta,
        latest.current.min,
        latest.current.max,
      );

      // Coalesce to one update per frame; pointermove can fire far faster.
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flush);
      }
      event.preventDefault();
    };

    const onPointerEnd = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (drag && event.pointerId !== drag.pointerId) return;
      if (pendingRef.current !== null) flush();
      stopDragging();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [isDragging, flush, stopDragging]);

  return { isDragging, onPointerDown };
}
