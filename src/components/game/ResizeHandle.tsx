"use client";

interface ResizeHandleProps {
  label: string;
  valueNow: number;
  valueMin: number;
  valueMax: number;
  valueText: string;
  isDragging: boolean;
  disabled?: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

/**
 * The upper-right grip. Sized for touch (44px hit area) but drawn small so it
 * never hides the Pokémon it is attached to.
 */
export function ResizeHandle({
  label,
  valueNow,
  valueMin,
  valueMax,
  valueText,
  isDragging,
  disabled = false,
  onPointerDown,
  onKeyDown,
}: ResizeHandleProps) {
  return (
    <button
      type="button"
      role="slider"
      aria-label={label}
      aria-valuemin={Math.round(valueMin)}
      aria-valuemax={Math.round(valueMax)}
      aria-valuenow={Math.round(valueNow)}
      aria-valuetext={valueText}
      aria-orientation="vertical"
      disabled={disabled}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      // Only this element opts out of native touch gestures, so the rest of
      // the page keeps scrolling normally on mobile.
      style={{ touchAction: "none" }}
      className={`absolute -top-7 -right-7 z-30 grid h-11 w-11 place-items-center rounded-full
        transition-transform disabled:pointer-events-none disabled:opacity-0
        ${isDragging ? "scale-110" : "hover:scale-105"}`}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={`grid h-6 w-6 place-items-center rounded-md border-2 border-line-strong
          shadow-[var(--shadow-soft)] transition-colors
          ${isDragging ? "bg-truth" : "bg-accent"}`}
      >
        <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
          <path
            d="M11 1 1 11M11 5V1H7M5 11H1V7"
            stroke={isDragging ? "#ffffff" : "var(--accent-ink)"}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
