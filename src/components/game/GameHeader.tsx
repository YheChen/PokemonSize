"use client";

import { accuracyTier, formatScore, type RoundResult } from "@/lib/pokemon";

interface GameHeaderProps {
  roundNumber: number;
  roundCount: number;
  score: number;
  results: readonly RoundResult[];
}

const TIER_STYLES: Record<string, string> = {
  great: "bg-success border-success",
  good: "bg-accent border-line-strong",
  fair: "bg-warn border-warn",
  poor: "bg-danger border-danger",
};

export function GameHeader({ roundNumber, roundCount, score, results }: GameHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold tracking-tight">
          Round <span className="tabular-nums">{roundNumber}</span>
          <span className="text-ink-faint"> / {roundCount}</span>
        </p>
        <ul className="flex items-center gap-1.5" aria-label="Rounds completed">
          {Array.from({ length: roundCount }, (_, index) => {
            const result = results[index];
            const style = result
              ? TIER_STYLES[accuracyTier(result.accuracy)]
              : "bg-transparent border-line";
            return (
              <li
                key={index}
                className={`h-2 w-2 rounded-full border ${style}`}
                aria-hidden="true"
              />
            );
          })}
        </ul>
      </div>

      <p className="text-right text-sm font-semibold tracking-tight">
        <span className="text-ink-faint">Score </span>
        <span className="tabular-nums">{formatScore(score)}</span>
      </p>
    </header>
  );
}
