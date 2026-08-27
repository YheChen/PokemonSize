"use client";

import {
  accuracyLabel,
  describeMiss,
  formatAccuracy,
  formatHeightPrecise,
  formatScore,
  type Round,
  type RoundResult,
} from "@/lib/pokemon";

interface RoundRevealProps {
  round: Round;
  result: RoundResult;
  isFinalRound: boolean;
  onNext: () => void;
}

export function RoundReveal({ round, result, isFinalRound, onNext }: RoundRevealProps) {
  return (
    <div className="pokescale-rise space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{accuracyLabel(result.accuracy)}</h2>
        <p className="text-sm text-ink-soft">{describeMiss(round.target.displayName, result.ratioError)}</p>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border-2 border-line-strong bg-line-strong sm:grid-cols-4">
        <Stat label="Your guess" value={formatHeightPrecise(result.guessedHeightMeters)} />
        <Stat
          label="Actual"
          value={formatHeightPrecise(result.actualHeightMeters)}
          tone="truth"
        />
        <Stat label="Accuracy" value={formatAccuracy(result.accuracy)} />
        <Stat label="Points" value={`+${formatScore(result.score)}`} tone="accent" />
      </dl>

      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="w-full rounded-2xl border-2 border-line-strong bg-ink px-6 py-4 text-base font-bold
          tracking-tight text-bg transition hover:brightness-125 active:translate-y-px"
      >
        {isFinalRound ? "See results →" : "Next round →"}
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: string;
  tone?: "plain" | "truth" | "accent";
}) {
  const valueTone =
    tone === "truth" ? "text-truth" : tone === "accent" ? "text-ink" : "text-ink";

  return (
    <div className={`bg-surface px-4 py-3 ${tone === "accent" ? "bg-accent" : ""}`}>
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd className={`mt-0.5 text-lg font-bold tracking-tight tabular-nums ${valueTone}`}>
        {value}
      </dd>
    </div>
  );
}
