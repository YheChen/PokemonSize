"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssetPreloader } from "./AssetPreloader";
import { GameHeader } from "./GameHeader";
import { GameStage } from "./GameStage";
import { LandingScreen } from "./LandingScreen";
import { ResizeControls } from "./ResizeControls";
import { ResultsScreen } from "./ResultsScreen";
import { RoundReveal } from "./RoundReveal";
import { useElementSize } from "@/hooks/useElementSize";
import {
  INITIAL_SCALE_DEAD_ZONE,
  ROUNDS_PER_GAME,
  calculateCorrectPixelHeight,
  clamp,
  createGame,
  maxScoreFor,
  maxTargetHeightForRound,
  referencePixelHeightFor,
  resolveStageMetrics,
  scoreRound,
  totalScore as sumScores,
  type GameState,
  type Pokemon,
  type Round,
} from "@/lib/pokemon";

/**
 * Charmander beside Lucario: exactly 2× taller, so the landing preview reads as
 * a clean "twice the height", and narrow enough to fit a 320px stage.
 */
const DEMO_REFERENCE_ID = 4;
const DEMO_TARGET_ID = 448;

const EMPTY_GAME: GameState = {
  phase: "landing",
  mode: "classic",
  rounds: [],
  currentRoundIndex: 0,
  results: [],
};

interface PokeScaleGameProps {
  pokemon: readonly Pokemon[];
}

export function PokeScaleGame({ pokemon }: PokeScaleGameProps) {
  const [state, setState] = useState<GameState>(EMPTY_GAME);
  const [gameKey, setGameKey] = useState(0);
  const [targetPixelHeight, setTargetPixelHeight] = useState(0);
  const [generationFailed, setGenerationFailed] = useState(false);

  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  const metrics = useMemo(
    () => resolveStageMetrics(stageSize.width, stageSize.height),
    [stageSize.width, stageSize.height],
  );

  const currentRound = state.rounds[state.currentRoundIndex] ?? null;
  const demoRound = useMemo(() => buildDemoRound(pokemon), [pokemon]);

  const stageRound = state.phase === "landing" ? demoRound : currentRound;
  // Scaled by the reference's own size tier, so a Wailord round draws bigger
  // than a Joltik round. Everything downstream measures against this value.
  const referencePixelHeight = useMemo(
    () => (stageRound ? referencePixelHeightFor(stageRound, metrics) : 0),
    [stageRound, metrics],
  );
  const correctPixelHeight = useMemo(
    () => correctHeightFor(stageRound, referencePixelHeight),
    [stageRound, referencePixelHeight],
  );
  const maxTargetPixelHeight = useMemo(
    () =>
      stageRound
        ? maxTargetHeightForRound(stageRound, metrics)
        : metrics.maxTargetPixelHeight,
    [stageRound, metrics],
  );

  // Size the target when a round opens, then keep the player's relative guess
  // intact if the stage changes underneath them.
  const initKeyRef = useRef<string | null>(null);
  const lastReferenceHeightRef = useRef(0);

  useLayoutEffect(() => {
    if (!currentRound || referencePixelHeight <= 0) return;

    const key = `${gameKey}:${state.currentRoundIndex}:${currentRound.id}`;
    if (initKeyRef.current !== key) {
      initKeyRef.current = key;
      lastReferenceHeightRef.current = referencePixelHeight;
      setTargetPixelHeight(
        openingTargetHeight(
          currentRound,
          correctPixelHeight,
          metrics.minTargetPixelHeight,
          maxTargetPixelHeight,
        ),
      );
      return;
    }

    const previous = lastReferenceHeightRef.current;
    if (previous > 0 && Math.abs(referencePixelHeight - previous) > 0.5) {
      const factor = referencePixelHeight / previous;
      lastReferenceHeightRef.current = referencePixelHeight;
      setTargetPixelHeight((height) =>
        clamp(height * factor, metrics.minTargetPixelHeight, maxTargetPixelHeight),
      );
    }
  }, [
    currentRound,
    gameKey,
    state.currentRoundIndex,
    metrics,
    referencePixelHeight,
    correctPixelHeight,
    maxTargetPixelHeight,
  ]);

  const startGame = useCallback(() => {
    const game = createGame({ pokemon, stage: metrics });
    if (game.rounds.length < ROUNDS_PER_GAME) {
      setGenerationFailed(true);
      return;
    }

    initKeyRef.current = null;
    lastReferenceHeightRef.current = 0;
    setGenerationFailed(false);
    setTargetPixelHeight(0);
    setGameKey((key) => key + 1);
    setState(game);
  }, [pokemon, metrics]);

  const lockIn = useCallback(() => {
    setState((current) => {
      // The phase guard is what makes a double-click harmless.
      if (current.phase !== "guessing") return current;
      const round = current.rounds[current.currentRoundIndex];
      if (!round || referencePixelHeight <= 0) return current;

      return {
        ...current,
        phase: "revealed",
        results: [
          ...current.results,
          scoreRound({
            round,
            guessedPixelHeight: targetPixelHeight,
            referencePixelHeight,
          }),
        ],
      };
    });
  }, [targetPixelHeight, referencePixelHeight]);

  const goToNextRound = useCallback(() => {
    setState((current) => {
      if (current.phase !== "revealed") return current;
      const nextIndex = current.currentRoundIndex + 1;
      if (nextIndex >= current.rounds.length) {
        return { ...current, phase: "results" };
      }
      return { ...current, phase: "guessing", currentRoundIndex: nextIndex };
    });
  }, []);

  const score = sumScores(state.results);
  const maxScore = maxScoreFor(state.rounds);
  const currentResult = state.results[state.currentRoundIndex] ?? null;
  const isFinalRound = state.currentRoundIndex === state.rounds.length - 1;

  const preloadUrls = useMemo(() => {
    const next = state.rounds[state.currentRoundIndex + 1];
    return next ? [next.reference.image, next.target.image] : [];
  }, [state.rounds, state.currentRoundIndex]);

  if (pokemon.length < 2 || generationFailed) {
    return <DataError />;
  }

  if (state.phase === "results") {
    return (
      <Shell>
        <ResultsScreen
          rounds={state.rounds}
          results={state.results}
          totalScore={score}
          maxScore={maxScore}
          onPlayAgain={startGame}
        />
      </Shell>
    );
  }

  const revealed = state.phase === "revealed";
  // The preview pair skips round generation, so clamp it the way a real round
  // would be clamped rather than letting it run off the edge of a small stage.
  const stageTargetHeight =
    state.phase === "landing"
      ? Math.min(correctPixelHeight, maxTargetPixelHeight)
      : targetPixelHeight;

  return (
    <Shell>
      <AssetPreloader urls={preloadUrls} />

      {state.phase === "landing" ? (
        <LandingScreen onPlay={startGame} ready={referencePixelHeight > 0} />
      ) : (
        <>
          <GameHeader
            roundNumber={state.currentRoundIndex + 1}
            roundCount={state.rounds.length}
            score={score}
            results={state.results}
          />
          {currentRound ? (
            <h1 className="mt-4 text-center text-2xl font-bold tracking-[-0.02em] text-balance sm:text-3xl">
              How big is {currentRound.target.displayName}?
            </h1>
          ) : null}
        </>
      )}

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <GameStage
          stageRef={stageRef}
          round={stageRound}
          metrics={metrics}
          referencePixelHeight={referencePixelHeight}
          targetPixelHeight={stageTargetHeight}
          correctPixelHeight={correctPixelHeight}
          maxTargetPixelHeight={maxTargetPixelHeight}
          revealed={revealed}
          preview={state.phase === "landing"}
          onTargetHeightChange={setTargetPixelHeight}
        />
      </div>

      {state.phase === "guessing" && currentRound ? (
        <div className="mt-5 space-y-4">
          <ResizeControls
            pixelHeight={targetPixelHeight}
            min={metrics.minTargetPixelHeight}
            max={maxTargetPixelHeight}
            targetName={currentRound.target.displayName}
            referenceName={currentRound.reference.displayName}
            referencePixelHeight={referencePixelHeight}
            disabled={false}
            onChange={setTargetPixelHeight}
          />
          <button
            type="button"
            onClick={lockIn}
            disabled={targetPixelHeight <= 0}
            className="w-full rounded-2xl border-2 border-line-strong bg-accent px-6 py-4 text-base font-bold
              tracking-[-0.01em] text-accent-ink uppercase transition
              hover:brightness-105 active:translate-y-px disabled:opacity-50"
          >
            Lock it in
          </button>
        </div>
      ) : null}

      {revealed && currentRound && currentResult ? (
        <div className="mt-5">
          <RoundReveal
            round={currentRound}
            result={currentResult}
            isFinalRound={isFinalRound}
            onNext={goToNextRound}
          />
        </div>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 pt-5 pb-4 sm:px-6">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-[1120px] px-4 pb-5 text-center text-xs text-ink-faint sm:px-6">
        PokéScale is an unofficial fan project. Pokémon names, artwork and characters
        belong to their respective owners. Sprite data from PokéAPI.
      </footer>
    </div>
  );
}

function DataError() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Couldn&rsquo;t load Pokémon data.
        </h1>
        <p className="text-ink-soft">Refresh and try again.</p>
      </div>
    </div>
  );
}

function correctHeightFor(round: Round | null, referencePixelHeight: number): number {
  if (!round) return 0;
  return calculateCorrectPixelHeight({
    referenceHeightMeters: round.reference.heightMeters,
    targetHeightMeters: round.target.heightMeters,
    referencePixelHeight,
  });
}

/**
 * Where the target starts. Clamping can drag a deliberately-wrong opening size
 * back onto the answer, so fall through progressively bolder offsets until one
 * lands clear of it.
 */
function openingTargetHeight(
  round: Round,
  correctPixelHeight: number,
  min: number,
  max: number,
): number {
  if (correctPixelHeight <= 0) return min;

  const rolled = round.initialTargetScale;
  // Mirroring the rolled scale keeps the opening equally wrong in the other
  // direction when the first choice would be clamped flat against a bound.
  const candidates = [rolled, 1 / rolled, 0.62, 1.45, 0.4, 2];

  for (const scale of candidates) {
    const raw = correctPixelHeight * scale;
    if (raw < min || raw > max) continue;
    if (Math.abs(scale - 1) > INITIAL_SCALE_DEAD_ZONE) return raw;
  }

  // Nothing landed inside the range; settle for the closest legal opening that
  // still is not sitting on the answer.
  for (const scale of candidates) {
    const candidate = clamp(correctPixelHeight * scale, min, max);
    if (Math.abs(candidate / correctPixelHeight - 1) > INITIAL_SCALE_DEAD_ZONE) {
      return candidate;
    }
  }

  return clamp(correctPixelHeight * 0.5, min, max);
}

function buildDemoRound(pokemon: readonly Pokemon[]): Round | null {
  const reference =
    pokemon.find((mon) => mon.id === DEMO_REFERENCE_ID) ?? pokemon[0] ?? null;
  const target =
    pokemon.find((mon) => mon.id === DEMO_TARGET_ID) ??
    pokemon.find((mon) => mon.id !== reference?.id) ??
    null;

  if (!reference || !target) return null;
  return { id: "demo", reference, target, initialTargetScale: 1 };
}
