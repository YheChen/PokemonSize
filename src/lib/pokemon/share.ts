import { MAX_GAME_SCORE } from "./constants";
import { accuracyEmoji } from "./scoring";
import { formatAccuracy, formatScore } from "./formatting";
import type { RoundResult } from "./types";

export const SHARE_TAGLINE = "How big are Pokémon, really?";

/**
 * Wordle-style grid. Deliberately leaks no Pokémon names, so sharing a result
 * never spoils the round for whoever reads it.
 */
export function buildShareText(
  results: readonly RoundResult[],
  totalScore: number,
  maxScore: number = MAX_GAME_SCORE,
): string {
  const rows = results.map(
    (result) => `${accuracyEmoji(result.accuracy)} ${formatAccuracy(result.accuracy)}`,
  );

  return [
    `PokéScale ${formatScore(totalScore)}/${formatScore(maxScore)}`,
    "",
    ...rows,
    "",
    SHARE_TAGLINE,
  ].join("\n");
}

export type ShareOutcome = "shared" | "copied" | "unavailable";

/** Web Share where available, clipboard otherwise, and never a silent failure. */
export async function shareResult(text: string): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "PokéScale", text });
      return "shared";
    } catch (error) {
      // A user-cancelled share is not a failure worth falling back from.
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      /* fall through to the manual path */
    }
  }

  return "unavailable";
}
