"use client";

import { useCallback } from "react";
import { PokemonFigure } from "./PokemonFigure";
import { ResizeHandle } from "./ResizeHandle";
import { usePointerResize } from "@/hooks/usePointerResize";
import {
  KEYBOARD_STEP,
  KEYBOARD_STEP_LARGE,
  clamp,
  figureWidth,
  formatHeightPrecise,
  type Round,
} from "@/lib/pokemon";

interface ResizablePokemonProps {
  round: Round;
  pixelHeight: number;
  minPixelHeight: number;
  maxPixelHeight: number;
  referencePixelHeight: number;
  revealed: boolean;
  /** Where the target should have been. Only drawn once the round is locked. */
  correctPixelHeight: number;
  onChange: (pixelHeight: number) => void;
}

/**
 * The target Pokémon: draggable, keyboard-adjustable, and always standing on
 * the stage floor. Growth is expressed purely as a taller box, never a CSS
 * scale transform, so the measured guess and the drawn figure cannot drift.
 */
export function ResizablePokemon({
  round,
  pixelHeight,
  minPixelHeight,
  maxPixelHeight,
  referencePixelHeight,
  revealed,
  correctPixelHeight,
  onChange,
}: ResizablePokemonProps) {
  const { isDragging, onPointerDown } = usePointerResize({
    height: pixelHeight,
    min: minPixelHeight,
    max: maxPixelHeight,
    disabled: revealed,
    onChange,
  });

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (revealed) return;
      const step = event.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;

      let next: number | null = null;
      switch (event.key) {
        case "ArrowUp":
        case "ArrowRight":
          next = pixelHeight + step;
          break;
        case "ArrowDown":
        case "ArrowLeft":
          next = pixelHeight - step;
          break;
        case "PageUp":
          next = pixelHeight + KEYBOARD_STEP_LARGE * 3;
          break;
        case "PageDown":
          next = pixelHeight - KEYBOARD_STEP_LARGE * 3;
          break;
        case "Home":
          next = minPixelHeight;
          break;
        case "End":
          next = maxPixelHeight;
          break;
        default:
          return;
      }

      event.preventDefault();
      onChange(clamp(next, minPixelHeight, maxPixelHeight));
    },
    [revealed, pixelHeight, minPixelHeight, maxPixelHeight, onChange],
  );

  const guessWidth = figureWidth(round.target, pixelHeight);
  const ghostWidth = revealed ? figureWidth(round.target, correctPixelHeight) : 0;
  const cellWidth = Math.max(guessWidth, ghostWidth);
  const cellHeight = Math.max(pixelHeight, revealed ? correctPixelHeight : 0);
  // Whichever figure is smaller goes on top, so the correct size is always
  // visible instead of hiding behind an oversized guess.
  const ghostOnTop = revealed && correctPixelHeight < pixelHeight;

  const multiple =
    referencePixelHeight > 0 ? pixelHeight / referencePixelHeight : 0;
  const valueText = `${multiple.toFixed(2)} times the height of ${round.reference.displayName}`;

  return (
    <div
      className="relative shrink-0"
      style={{ width: cellWidth, height: cellHeight }}
    >
      {revealed && correctPixelHeight > 0 ? (
        <>
          <PokemonFigure
            pokemon={round.target}
            pixelHeight={correctPixelHeight}
            variant="ghost"
            layer={ghostOnTop ? 3 : 1}
            className="pokescale-fade"
          />
          <SizeMarker
            pixelHeight={correctPixelHeight}
            label="Actual"
            value={formatHeightPrecise(round.target.heightMeters)}
            tone="truth"
            align="right"
          />
          <SizeMarker
            pixelHeight={pixelHeight}
            label="Your guess"
            value={formatHeightPrecise(
              round.reference.heightMeters * (pixelHeight / referencePixelHeight),
            )}
            tone="ink"
            align="left"
            // On a close guess the two rules nearly coincide, so nudge this
            // label clear of the actual-size one instead of letting them stack.
            labelOffset={
              Math.abs(pixelHeight - correctPixelHeight) < LABEL_CLEARANCE
                ? pixelHeight >= correctPixelHeight
                  ? -LABEL_CLEARANCE
                  : LABEL_CLEARANCE
                : 0
            }
            layer={5}
          />
        </>
      ) : null}

      <PokemonFigure
        pokemon={round.target}
        pixelHeight={pixelHeight}
        variant={revealed ? "color" : "silhouette"}
        layer={2}
      />

      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: guessWidth, height: pixelHeight, zIndex: 3 }}
      >
        {!revealed ? (
          <>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -inset-1 rounded border-2 border-dashed transition-colors
                ${isDragging ? "border-truth" : "border-line-strong/35"}`}
            />
            <ResizeHandle
              label={`Resize ${round.target.displayName}`}
              valueNow={pixelHeight}
              valueMin={minPixelHeight}
              valueMax={maxPixelHeight}
              valueText={valueText}
              isDragging={isDragging}
              onPointerDown={onPointerDown}
              onKeyDown={onKeyDown}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Vertical room a marker label needs to stay clear of its neighbour. */
const LABEL_CLEARANCE = 22;
/** Thickness of the dashed rule, from .pokescale-marker's border-top. */
const MARKER_RULE_WIDTH = 2;

interface SizeMarkerProps {
  pixelHeight: number;
  label: string;
  value: string;
  tone: "truth" | "ink";
  align: "left" | "right";
  /** Pixels to shift the label *down* off its rule; the rule never moves. */
  labelOffset?: number;
  layer?: number;
}

/** Dashed rule at a given height, so the miss is readable at a glance. */
function SizeMarker({
  pixelHeight,
  label,
  value,
  tone,
  align,
  labelOffset = 0,
  layer = 4,
}: SizeMarkerProps) {
  const color = tone === "truth" ? "text-truth" : "text-ink-faint";

  return (
    <div
      aria-hidden="true"
      className={`pokescale-marker pokescale-fade pointer-events-none absolute -inset-x-4 flex items-center ${color} ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
      // Zero height is load-bearing: `bottom` positions the box's lower edge,
      // but the rule is drawn with border-top. Any height at all would lift the
      // line off the measurement by exactly that much. The half-rule nudge then
      // centres the stroke on the height instead of resting it on top.
      style={{
        bottom: pixelHeight - MARKER_RULE_WIDTH / 2,
        height: 0,
        zIndex: layer,
      }}
    >
      <span
        style={{ transform: `translateY(${labelOffset}px)` }}
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap uppercase
          ${tone === "truth" ? "bg-truth text-white" : "bg-line text-ink-soft"}`}
      >
        {label} · {value}
      </span>
    </div>
  );
}
