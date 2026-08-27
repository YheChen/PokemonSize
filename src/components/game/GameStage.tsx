"use client";

import { PokemonFigure } from "./PokemonFigure";
import { ResizablePokemon } from "./ResizablePokemon";
import {
  STAGE_MAX_HEIGHT_PER_WIDTH,
  figureWidth,
  formatHeight,
  type Pokemon,
  type Round,
  type StageMetrics,
} from "@/lib/pokemon";

interface GameStageProps {
  stageRef: (node: HTMLDivElement | null) => void;
  round: Round | null;
  metrics: StageMetrics;
  targetPixelHeight: number;
  correctPixelHeight: number;
  maxTargetPixelHeight: number;
  revealed: boolean;
  /** Landing preview: both figures fixed, nothing interactive. */
  preview?: boolean;
  onTargetHeightChange: (pixelHeight: number) => void;
}

/**
 * The playfield. Both Pokémon are anchored to the same floor so that only their
 * heights ever differ — the comparison the whole game rests on.
 */
export function GameStage({
  stageRef,
  round,
  metrics,
  targetPixelHeight,
  correctPixelHeight,
  maxTargetPixelHeight,
  revealed,
  preview = false,
  onTargetHeightChange,
}: GameStageProps) {
  const ready = round !== null && metrics.referencePixelHeight > 0;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col justify-center">
      <div
        ref={stageRef}
        className="relative min-h-[200px] w-full flex-1"
        style={{
          maxHeight:
            metrics.usableWidth > 0
              ? metrics.usableWidth * STAGE_MAX_HEIGHT_PER_WIDTH
              : undefined,
        }}
        role="img"
        aria-label={
          round
            ? `${round.target.displayName} shown next to ${round.reference.displayName} on a shared ground line.`
            : "Pokémon size comparison stage"
        }
      >
        <div
          aria-hidden="true"
          className="pokescale-ground absolute inset-x-0 bottom-0 h-[2px]"
        />

        {ready ? (
          <div
            className="absolute inset-x-0 bottom-0 flex items-end justify-center"
            style={{ gap: metrics.gap }}
          >
            <StaticFigure
              pokemon={round.reference}
              pixelHeight={metrics.referencePixelHeight}
              variant={revealed && !preview ? "color" : "silhouette"}
            />

            {/* Target sits to the right of the reference so its upper-right
                grip reaches into open space instead of over its neighbour. */}
            {preview ? (
              <StaticFigure
                pokemon={round.target}
                pixelHeight={targetPixelHeight}
                variant="silhouette"
              />
            ) : (
              <ResizablePokemon
                round={round}
                pixelHeight={targetPixelHeight}
                minPixelHeight={metrics.minTargetPixelHeight}
                maxPixelHeight={maxTargetPixelHeight}
                referencePixelHeight={metrics.referencePixelHeight}
                revealed={revealed}
                correctPixelHeight={correctPixelHeight}
                onChange={onTargetHeightChange}
              />
            )}
          </div>
        ) : null}
      </div>

      {round ? (
        <div
          className="mt-3 flex shrink-0 items-start justify-center text-center"
          style={{ gap: metrics.gap }}
        >
          <Caption
            width={figureWidth(round.reference, metrics.referencePixelHeight)}
            eyebrow="Reference"
            name={round.reference.displayName}
            // Held back until the reveal: during the round the reference is a
            // yardstick to eyeball, not a number to do arithmetic with.
            detail={revealed && !preview ? formatHeight(round.reference.heightMeters) : undefined}
          />
          <Caption
            width={Math.max(
              figureWidth(round.target, targetPixelHeight),
              revealed ? figureWidth(round.target, correctPixelHeight) : 0,
            )}
            eyebrow={preview ? "Resize me" : "Target"}
            // The prompt already names the target, so hiding it here just
            // makes the caption row look unfinished.
            name={round.target.displayName}
            emphasis
          />
        </div>
      ) : null}
    </div>
  );
}

function StaticFigure({
  pokemon,
  pixelHeight,
  variant,
}: {
  pokemon: Pokemon;
  pixelHeight: number;
  variant: "silhouette" | "color";
}) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: figureWidth(pokemon, pixelHeight), height: pixelHeight }}
    >
      <PokemonFigure pokemon={pokemon} pixelHeight={pixelHeight} variant={variant} />
    </div>
  );
}

function Caption({
  width,
  eyebrow,
  name,
  detail,
  emphasis = false,
}: {
  width: number;
  eyebrow: string;
  name: string;
  detail?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="shrink-0 px-1" style={{ width: Math.max(width, 96) }}>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {eyebrow}
      </p>
      <p
        className={`text-sm leading-snug font-semibold text-balance ${
          emphasis ? "text-ink" : "text-ink-soft"
        }`}
      >
        {name}
      </p>
      {detail ? (
        <p className="pokescale-fade text-xs text-ink-faint tabular-nums">{detail}</p>
      ) : null}
    </div>
  );
}
