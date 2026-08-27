import { MAX_ROUND_SCORE } from "./constants";

/**
 * Proportional, multiplicatively symmetric accuracy: guessing 2× too big and
 * 2× too small are equally wrong, whatever the Pokémon's absolute size.
 */
export function calculateAccuracy(
  guessedHeightMeters: number,
  actualHeightMeters: number,
): number {
  if (
    !Number.isFinite(guessedHeightMeters) ||
    !Number.isFinite(actualHeightMeters) ||
    guessedHeightMeters <= 0 ||
    actualHeightMeters <= 0
  ) {
    return 0;
  }

  const ratio = guessedHeightMeters / actualHeightMeters;
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;

  return Math.min(Math.max(Math.min(ratio, 1 / ratio), 0), 1);
}

/** Squared curve: precision pays off far more than a merely decent guess. */
export function accuracyToScore(accuracy: number): number {
  if (!Number.isFinite(accuracy)) return 0;
  const clamped = Math.max(0, Math.min(1, accuracy));
  return Math.round(MAX_ROUND_SCORE * clamped ** 2);
}

export function accuracyLabel(accuracy: number): string {
  if (!Number.isFinite(accuracy)) return "Way off";
  if (accuracy >= 0.99) return "Perfect!";
  if (accuracy >= 0.95) return "Incredible";
  if (accuracy >= 0.9) return "So close";
  if (accuracy >= 0.8) return "Pretty good";
  if (accuracy >= 0.65) return "Not bad";
  if (accuracy >= 0.5) return "A little off";
  return "Way off";
}

export function accuracyEmoji(accuracy: number): string {
  if (!Number.isFinite(accuracy)) return "🟥";
  if (accuracy >= 0.95) return "🟩";
  if (accuracy >= 0.85) return "🟨";
  if (accuracy >= 0.7) return "🟧";
  return "🟥";
}

/** Coarse band used for the header dots and result colouring. */
export type AccuracyTier = "great" | "good" | "fair" | "poor";

export function accuracyTier(accuracy: number): AccuracyTier {
  if (!Number.isFinite(accuracy)) return "poor";
  if (accuracy >= 0.95) return "great";
  if (accuracy >= 0.85) return "good";
  if (accuracy >= 0.7) return "fair";
  return "poor";
}

export function summariseTotal(totalScore: number, maxScore: number): string {
  const share = maxScore > 0 ? totalScore / maxScore : 0;
  if (share >= 0.95) return "Pokédex-grade eye for scale.";
  if (share >= 0.85) return "Excellent eye for scale.";
  if (share >= 0.7) return "Solid sense of scale.";
  if (share >= 0.5) return "Getting the hang of it.";
  if (share >= 0.3) return "Room to grow, literally.";
  return "Scale is hard. Try another five.";
}
