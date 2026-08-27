"use client";

interface LandingScreenProps {
  onPlay: () => void;
  ready: boolean;
}

export function LandingScreen({ onPlay, ready }: LandingScreenProps) {
  return (
    <div className="pokescale-fade mx-auto w-full max-w-xl text-center">
      <h1 className="text-5xl font-bold tracking-[-0.03em] sm:text-6xl">
        Poké<span className="text-ink-faint">Scale</span>
      </h1>
      <p className="mt-2 text-lg font-semibold tracking-tight text-ink-soft">
        How big are Pokémon, really?
      </p>

      <p className="mx-auto mt-6 max-w-sm text-balance text-ink-soft">
        Resize one Pokémon until you think it&rsquo;s the correct size relative to the
        reference.
      </p>

      <p className="mt-6 font-semibold tracking-tight">
        5 Pokémon. 5 guesses. 5,000 points.
      </p>

      <button
        type="button"
        onClick={onPlay}
        disabled={!ready}
        autoFocus
        className="mt-7 w-full max-w-xs rounded-2xl border-2 border-line-strong bg-accent px-8 py-4
          text-lg font-bold tracking-tight text-accent-ink transition
          hover:brightness-105 active:translate-y-px disabled:opacity-50"
      >
        {ready ? "Play" : "Loading…"}
      </button>
    </div>
  );
}
