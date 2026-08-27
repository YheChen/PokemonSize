import {
  FIGURE_GAP_FRACTION,
  REFERENCE_TIER_SCALE,
  SIZE_TIER_BOUNDS,
  FIGURE_GAP_MIN,
  MIN_TARGET_PIXEL_HEIGHT,
  REFERENCE_PIXEL_MAX,
  REFERENCE_STAGE_FRACTION,
  REFERENCE_WIDTH_DIVISOR,
  STAGE_HEADROOM,
} from "./constants";
import type { Pokemon, Round, SizeTier, StageMetrics } from "./types";

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  // NaN has no meaningful side to fall to; infinities clamp to a real bound.
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** True only for numbers that are safe to divide by. */
function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export interface CorrectPixelHeightInput {
  referenceHeightMeters: number;
  targetHeightMeters: number;
  referencePixelHeight: number;
}

/**
 * The on-screen height the target must have to be truly in scale with the
 * reference. Every other measurement in the game derives from this.
 */
export function calculateCorrectPixelHeight({
  referenceHeightMeters,
  targetHeightMeters,
  referencePixelHeight,
}: CorrectPixelHeightInput): number {
  if (
    !isPositiveFinite(referenceHeightMeters) ||
    !isPositiveFinite(targetHeightMeters) ||
    !isPositiveFinite(referencePixelHeight)
  ) {
    return 0;
  }
  return referencePixelHeight * (targetHeightMeters / referenceHeightMeters);
}

export interface GuessedHeightInput {
  referenceHeightMeters: number;
  referencePixelHeight: number;
  guessedPixelHeight: number;
}

/** Converts the size the player dragged to back into real-world metres. */
export function calculateGuessedHeightMeters({
  referenceHeightMeters,
  referencePixelHeight,
  guessedPixelHeight,
}: GuessedHeightInput): number {
  if (
    !isPositiveFinite(referenceHeightMeters) ||
    !isPositiveFinite(referencePixelHeight) ||
    !isPositiveFinite(guessedPixelHeight)
  ) {
    return 0;
  }
  return referenceHeightMeters * (guessedPixelHeight / referencePixelHeight);
}

/**
 * Reference height is a pure function of the stage, never of the round, so
 * the reference size can't hint at how big the answer is.
 */
export function calculateReferencePixelHeight(stageHeight: number, usableWidth: number): number {
  if (!isPositiveFinite(stageHeight) || !isPositiveFinite(usableWidth)) return 0;
  // Only ever capped, never floored: a floor could push the reference past the
  // point where a MAX_CLASSIC_RATIO target still fits on a small stage.
  return Math.min(
    stageHeight * REFERENCE_STAGE_FRACTION,
    usableWidth / REFERENCE_WIDTH_DIVISOR,
    REFERENCE_PIXEL_MAX,
  );
}

export function resolveStageMetrics(width: number, height: number): StageMetrics {
  const safeWidth = isPositiveFinite(width) ? width : 0;
  const safeHeight = isPositiveFinite(height) ? height : 0;
  const gap = safeWidth > 0 ? Math.max(FIGURE_GAP_MIN, safeWidth * FIGURE_GAP_FRACTION) : 0;
  const usableWidth = Math.max(0, safeWidth - gap);

  return {
    width: safeWidth,
    height: safeHeight,
    usableWidth,
    gap,
    referencePixelHeight: calculateReferencePixelHeight(safeHeight, usableWidth),
    minTargetPixelHeight: MIN_TARGET_PIXEL_HEIGHT,
    maxTargetPixelHeight: Math.max(MIN_TARGET_PIXEL_HEIGHT, safeHeight * STAGE_HEADROOM),
  };
}

const SIZE_TIER_ORDER: readonly SizeTier[] = ["xs", "s", "m", "l", "xl"];

/** Which real-world size band a Pokémon falls into. */
export function sizeTier(heightMeters: number): SizeTier {
  if (!isPositiveFinite(heightMeters)) return "m";
  const index = SIZE_TIER_BOUNDS.findIndex((bound) => heightMeters < bound);
  return SIZE_TIER_ORDER[index === -1 ? SIZE_TIER_ORDER.length - 1 : index] as SizeTier;
}

/**
 * On-screen height of this round's reference: the stage's safe height, scaled
 * down by the reference's own size tier.
 *
 * This reads the *reference's* height, never the target's, so it still cannot
 * hint at the answer. A player who recognises the reference already knows how
 * big it is; drawing it accordingly tells them nothing new.
 */
export function referencePixelHeightFor(round: Round, metrics: StageMetrics): number {
  return metrics.referencePixelHeight * REFERENCE_TIER_SCALE[sizeTier(round.reference.heightMeters)];
}

/** Rendered width of a figure drawn at a given height. */
export function figureWidth(pokemon: Pokemon, pixelHeight: number): number {
  if (!isPositiveFinite(pixelHeight) || !isPositiveFinite(pokemon.aspectRatio)) return 0;
  return pixelHeight * pokemon.aspectRatio;
}

/**
 * How tall the player may drag this round's target. Bounded by the stage height
 * and by whatever width the reference leaves behind. Both are facts the player
 * can already see, so this reveals nothing about the answer.
 */
export function maxTargetHeightForRound(round: Round, metrics: StageMetrics): number {
  const referenceWidth = figureWidth(round.reference, referencePixelHeightFor(round, metrics));
  const widthBudget = Math.max(0, metrics.usableWidth - referenceWidth);
  const byWidth = isPositiveFinite(round.target.aspectRatio)
    ? widthBudget / round.target.aspectRatio
    : Number.POSITIVE_INFINITY;

  return Math.max(
    metrics.minTargetPixelHeight,
    Math.min(metrics.maxTargetPixelHeight, byWidth),
  );
}

/** True when the correct answer is reachable and fully visible on this stage. */
export function roundFitsStage(round: Round, metrics: StageMetrics): boolean {
  if (metrics.referencePixelHeight <= 0) return false;

  const correctPixelHeight = calculateCorrectPixelHeight({
    referenceHeightMeters: round.reference.heightMeters,
    targetHeightMeters: round.target.heightMeters,
    referencePixelHeight: referencePixelHeightFor(round, metrics),
  });
  if (correctPixelHeight <= 0) return false;

  return correctPixelHeight <= maxTargetHeightForRound(round, metrics) + 0.5;
}

/** Ratio of the guess to the truth: 1.3 means "you made it 1.3× too big". */
export function calculateRatioError(
  guessedHeightMeters: number,
  actualHeightMeters: number,
): number {
  if (!isPositiveFinite(guessedHeightMeters) || !isPositiveFinite(actualHeightMeters)) {
    return 0;
  }
  return guessedHeightMeters / actualHeightMeters;
}
