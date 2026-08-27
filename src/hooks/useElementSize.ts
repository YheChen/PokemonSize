"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's box. The last known size is kept when the element
 * unmounts, so the game can still lay out a round while the stage is swapped.
 */
export function useElementSize<T extends HTMLElement>(): [
  (node: T | null) => void,
  ElementSize,
] {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  useLayoutEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const ref = useCallback((node: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentRect;
      setSize((current) =>
        Math.abs(current.width - box.width) < 0.5 &&
        Math.abs(current.height - box.height) < 0.5
          ? current
          : { width: box.width, height: box.height },
      );
    });

    observer.observe(node);
    observerRef.current = observer;

    const box = node.getBoundingClientRect();
    setSize({ width: box.width, height: box.height });
  }, []);

  return [ref, size];
}
