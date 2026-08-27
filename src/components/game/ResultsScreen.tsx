"use client";

import { ShareResult } from "./ShareResult";
import {
  accuracyEmoji,
  formatAccuracy,
  formatHeightPrecise,
  formatScore,
  summariseTotal,
  type Round,
  type RoundResult,
} from "@/lib/pokemon";

interface ResultsScreenProps {
  rounds: readonly Round[];
  results: readonly RoundResult[];
  totalScore: number;
  maxScore: number;
  onPlayAgain: () => void;
}

export function ResultsScreen({
  rounds,
  results,
  totalScore,
  maxScore,
  onPlayAgain,
}: ResultsScreenProps) {
  return (
    <div className="pokescale-rise mx-auto w-full max-w-xl space-y-8 py-6">
      <div className="text-center">
        <p className="text-[11px] font-semibold tracking-[0.28em] text-ink-faint uppercase">
          PokéScale
        </p>
        <p className="mt-3 text-6xl font-bold tracking-tight tabular-nums sm:text-7xl">
          {formatScore(totalScore)}
        </p>
        <p className="mt-1 text-lg font-semibold text-ink-faint tabular-nums">
          / {formatScore(maxScore)}
        </p>
        <p className="mt-4 text-lg font-semibold tracking-tight">
          {summariseTotal(totalScore, maxScore)}
        </p>
      </div>

      <ol className="overflow-hidden rounded-2xl border-2 border-line-strong">
        {results.map((result, index) => {
          const round = rounds[index];
          return (
            <li
              key={result.roundId}
              className="flex items-center gap-3 border-b-2 border-line-strong bg-surface px-3 py-2.5 last:border-b-0"
            >
              <span aria-hidden="true" className="text-base">
                {accuracyEmoji(result.accuracy)}
              </span>

              {round ? (
                <img
                  src={round.target.image}
                  alt=""
                  width={round.target.imageWidth}
                  height={round.target.imageHeight}
                  className="h-9 w-9 shrink-0 object-contain"
                  draggable={false}
                />
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {round ? round.target.displayName : `Round ${index + 1}`}
                </p>
                <p className="truncate text-xs text-ink-faint tabular-nums">
                  You {formatHeightPrecise(result.guessedHeightMeters)} · Actual{" "}
                  {formatHeightPrecise(result.actualHeightMeters)} ·{" "}
                  {formatAccuracy(result.accuracy)}
                </p>
              </div>

              <span className="shrink-0 text-sm font-bold tabular-nums">
                {formatScore(result.score)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onPlayAgain}
          autoFocus
          className="w-full rounded-2xl border-2 border-line-strong bg-accent px-6 py-4 text-base font-bold
            tracking-tight text-accent-ink transition hover:brightness-105 active:translate-y-px"
        >
          Play again
        </button>
        <ShareResult results={results} totalScore={totalScore} maxScore={maxScore} />
      </div>
    </div>
  );
}
