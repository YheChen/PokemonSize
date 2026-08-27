"use client";

import { KEYBOARD_STEP_LARGE, clamp } from "@/lib/pokemon";

interface ResizeControlsProps {
  pixelHeight: number;
  min: number;
  max: number;
  targetName: string;
  referenceName: string;
  referencePixelHeight: number;
  disabled: boolean;
  onChange: (pixelHeight: number) => void;
}

/**
 * Non-drag path to the same state. Dragging is the fun way to play; this is the
 * way that works with a keyboard, a screen reader, or an unsteady hand.
 */
export function ResizeControls({
  pixelHeight,
  min,
  max,
  targetName,
  referenceName,
  referencePixelHeight,
  disabled,
  onChange,
}: ResizeControlsProps) {
  const nudge = (delta: number) => onChange(clamp(pixelHeight + delta, min, max));
  const multiple = referencePixelHeight > 0 ? pixelHeight / referencePixelHeight : 0;

  return (
    <div className="flex items-center gap-3">
      <StepButton
        label={`Make ${targetName} smaller`}
        glyph="−"
        disabled={disabled || pixelHeight <= min}
        onClick={() => nudge(-KEYBOARD_STEP_LARGE)}
      />

      <div className="flex-1">
        <input
          type="range"
          className="pokescale-range"
          min={min}
          max={max}
          step={1}
          value={clamp(pixelHeight, min, max)}
          disabled={disabled}
          aria-label={`Size of ${targetName}`}
          aria-valuetext={`${multiple.toFixed(2)} times the height of ${referenceName}`}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="-mt-1 flex justify-between text-[10px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          <span>Smaller</span>
          <span>Bigger</span>
        </div>
      </div>

      <StepButton
        label={`Make ${targetName} bigger`}
        glyph="+"
        disabled={disabled || pixelHeight >= max}
        onClick={() => nudge(KEYBOARD_STEP_LARGE)}
      />
    </div>
  );
}

function StepButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-line-strong
        bg-surface text-xl leading-none font-semibold transition
        hover:bg-accent-soft active:translate-y-px disabled:opacity-35 disabled:hover:bg-surface"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
