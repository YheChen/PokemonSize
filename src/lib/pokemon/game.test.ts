import { describe, expect, it } from "vitest";
import dataset from "@/data/pokemon.generated.json";
import { MAX_GAME_SCORE, MAX_ROUND_SCORE, ROUNDS_PER_GAME } from "./constants";
import { createGame, scoreRound, totalScore } from "./game";
import { calculateCorrectPixelHeight } from "./sizing";
import { buildShareText } from "./share";
import type { Pokemon, Round, RoundResult } from "./types";

const pokemon = dataset as Pokemon[];

function round(referenceMeters: number, targetMeters: number): Round {
  const [reference, target] = pokemon as [Pokemon, Pokemon];
  return {
    id: "test-round",
    reference: { ...reference, heightMeters: referenceMeters },
    target: { ...target, heightMeters: targetMeters },
    initialTargetScale: 1.2,
  };
}

describe("createGame", () => {
  it("starts a five-round classic game with no results yet", () => {
    const game = createGame({ pokemon, seed: "fresh" });
    expect(game.phase).toBe("guessing");
    expect(game.mode).toBe("classic");
    expect(game.rounds).toHaveLength(ROUNDS_PER_GAME);
    expect(game.currentRoundIndex).toBe(0);
    expect(game.results).toEqual([]);
  });
});

describe("scoreRound", () => {
  it("awards full points for a pixel-perfect guess", () => {
    const testRound = round(1.7, 0.4);
    const referencePixelHeight = 300;
    const correctPixelHeight = calculateCorrectPixelHeight({
      referenceHeightMeters: 1.7,
      targetHeightMeters: 0.4,
      referencePixelHeight,
    });

    const result = scoreRound({
      round: testRound,
      guessedPixelHeight: correctPixelHeight,
      referencePixelHeight,
    });

    expect(result.correctPixelHeight).toBeCloseTo(70.588, 3);
    expect(result.guessedHeightMeters).toBeCloseTo(0.4, 10);
    expect(result.accuracy).toBeCloseTo(1, 10);
    expect(result.score).toBe(MAX_ROUND_SCORE);
    expect(result.ratioError).toBeCloseTo(1, 10);
  });

  it("reports the miss direction", () => {
    const result = scoreRound({
      round: round(1.7, 0.4),
      guessedPixelHeight: 100,
      referencePixelHeight: 300,
    });

    expect(result.guessedHeightMeters).toBeCloseTo(0.5667, 4);
    expect(result.ratioError).toBeCloseTo(1.4167, 4);
    expect(result.accuracy).toBeCloseTo(0.70588, 4);
    expect(result.score).toBe(498);
  });

  it("degrades safely when the stage has not been measured", () => {
    const result = scoreRound({
      round: round(1.7, 0.4),
      guessedPixelHeight: 0,
      referencePixelHeight: 0,
    });

    expect(Number.isFinite(result.guessedHeightMeters)).toBe(true);
    expect(Number.isFinite(result.accuracy)).toBe(true);
    expect(result.score).toBe(0);
  });
});

describe("totals and sharing", () => {
  const results: RoundResult[] = [0.96, 0.9, 0.99, 0.87, 0.6].map((accuracy, index) => ({
    roundId: `r${index}`,
    referencePokemonId: 1,
    targetPokemonId: 2,
    guessedHeightMeters: 1,
    actualHeightMeters: 1,
    guessedPixelHeight: 100,
    correctPixelHeight: 100,
    ratioError: 1,
    accuracy,
    score: Math.round(MAX_ROUND_SCORE * accuracy ** 2),
  }));

  it("caps a perfect game at 5000", () => {
    const perfect = results.map((result) => ({ ...result, score: MAX_ROUND_SCORE }));
    expect(totalScore(perfect)).toBe(MAX_GAME_SCORE);
  });

  it("sums round scores", () => {
    expect(totalScore(results)).toBe(
      results.reduce((sum, result) => sum + result.score, 0),
    );
  });

  it("builds a spoiler-free share grid", () => {
    const text = buildShareText(results, totalScore(results));
    expect(text).toContain(`PokéScale ${totalScore(results).toLocaleString("en-US")}/5,000`);
    expect(text).toContain("🟩 96.0%");
    expect(text).toContain("🟨 90.0%");
    expect(text).toContain("🟥 60.0%");
    expect(text).toContain("How big are Pokémon, really?");
    for (const mon of pokemon.slice(0, 5)) {
      expect(text).not.toContain(mon.displayName);
    }
  });

  it("handles an empty game without producing junk", () => {
    expect(totalScore([])).toBe(0);
    expect(buildShareText([], 0)).toContain("PokéScale 0/5,000");
  });
});
