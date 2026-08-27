import { MAX_GAME_SCORE, ROUNDS_PER_GAME } from "./constants";
import { generateGameRounds } from "./rounds";
import { accuracyToScore, calculateAccuracy } from "./scoring";
import {
  calculateCorrectPixelHeight,
  calculateGuessedHeightMeters,
  calculateRatioError,
} from "./sizing";
import type { GameMode, GameState, Pokemon, Round, RoundResult, StageMetrics } from "./types";

export interface CreateGameOptions {
  pokemon: readonly Pokemon[];
  mode?: GameMode;
  roundCount?: number;
  seed?: string;
  stage?: StageMetrics;
}

export function createGame({
  pokemon,
  mode = "classic",
  roundCount = ROUNDS_PER_GAME,
  seed,
  stage,
}: CreateGameOptions): GameState {
  return {
    phase: "guessing",
    mode,
    rounds: generateGameRounds({ pokemon, count: roundCount, seed, stage }),
    currentRoundIndex: 0,
    results: [],
  };
}

export interface ScoreRoundInput {
  round: Round;
  guessedPixelHeight: number;
  referencePixelHeight: number;
}

/** Turns a dragged pixel height into the round's full scored outcome. */
export function scoreRound({
  round,
  guessedPixelHeight,
  referencePixelHeight,
}: ScoreRoundInput): RoundResult {
  const referenceHeightMeters = round.reference.heightMeters;
  const actualHeightMeters = round.target.heightMeters;

  const guessedHeightMeters = calculateGuessedHeightMeters({
    referenceHeightMeters,
    referencePixelHeight,
    guessedPixelHeight,
  });

  const correctPixelHeight = calculateCorrectPixelHeight({
    referenceHeightMeters,
    targetHeightMeters: actualHeightMeters,
    referencePixelHeight,
  });

  const accuracy = calculateAccuracy(guessedHeightMeters, actualHeightMeters);

  return {
    roundId: round.id,
    referencePokemonId: round.reference.id,
    targetPokemonId: round.target.id,
    guessedHeightMeters,
    actualHeightMeters,
    guessedPixelHeight,
    correctPixelHeight,
    ratioError: calculateRatioError(guessedHeightMeters, actualHeightMeters),
    accuracy,
    score: accuracyToScore(accuracy),
  };
}

export function totalScore(results: readonly RoundResult[]): number {
  return results.reduce((sum, result) => sum + result.score, 0);
}

export function maxScoreFor(rounds: readonly Round[]): number {
  return rounds.length > 0 ? rounds.length * (MAX_GAME_SCORE / ROUNDS_PER_GAME) : MAX_GAME_SCORE;
}
