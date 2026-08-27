import { describe, expect, it } from "vitest";
import dataset from "@/data/pokemon.generated.json";
import {
  MAX_CLASSIC_RATIO,
  MIN_CLASSIC_RATIO,
  INITIAL_SCALE_MAX,
  INITIAL_SCALE_MIN,
  ROUNDS_PER_GAME,
} from "./constants";
import { filterPlayablePokemon, generateGameRounds, isPlayablePokemon } from "./rounds";
import { resolveStageMetrics, roundFitsStage } from "./sizing";
import type { Pokemon } from "./types";

const pokemon = dataset as Pokemon[];

function makePokemon(overrides: Partial<Pokemon> & { id: number }): Pokemon {
  return {
    name: `mon-${overrides.id}`,
    displayName: `Mon ${overrides.id}`,
    heightDecimeters: 10,
    heightMeters: 1,
    image: `/pokemon/normalized/${overrides.id}.png`,
    imageWidth: 100,
    imageHeight: 100,
    aspectRatio: 1,
    ...overrides,
  };
}

describe("dataset", () => {
  it("ships enough valid Pokémon to play", () => {
    expect(pokemon.length).toBeGreaterThanOrEqual(151);
    expect(filterPlayablePokemon(pokemon)).toHaveLength(pokemon.length);
  });

  it("stores heights in metres derived from decimetres", () => {
    for (const mon of pokemon) {
      expect(mon.heightMeters).toBeCloseTo(mon.heightDecimeters / 10, 6);
      expect(mon.heightMeters).toBeGreaterThan(0);
    }
  });

  it("records an aspect ratio that matches the normalized sprite", () => {
    for (const mon of pokemon) {
      expect(mon.aspectRatio).toBeCloseTo(mon.imageWidth / mon.imageHeight, 3);
    }
  });

  it("has unique ids and image paths", () => {
    expect(new Set(pokemon.map((mon) => mon.id)).size).toBe(pokemon.length);
    expect(new Set(pokemon.map((mon) => mon.image)).size).toBe(pokemon.length);
  });
});

describe("isPlayablePokemon", () => {
  it("rejects records the game could not render or score", () => {
    expect(isPlayablePokemon(makePokemon({ id: 1, heightMeters: 0 }))).toBe(false);
    expect(isPlayablePokemon(makePokemon({ id: 2, heightMeters: Number.NaN }))).toBe(false);
    expect(isPlayablePokemon(makePokemon({ id: 3, aspectRatio: 0 }))).toBe(false);
    expect(isPlayablePokemon(makePokemon({ id: 4, image: "" }))).toBe(false);
    expect(isPlayablePokemon(makePokemon({ id: 5 }))).toBe(true);
  });
});

describe("generateGameRounds", () => {
  it("produces exactly five playable rounds", () => {
    const rounds = generateGameRounds({ pokemon });
    expect(rounds).toHaveLength(ROUNDS_PER_GAME);
  });

  it("never compares a Pokémon with itself", () => {
    for (let i = 0; i < 200; i += 1) {
      for (const round of generateGameRounds({ pokemon, seed: `self-${i}` })) {
        expect(round.reference.id).not.toBe(round.target.id);
      }
    }
  });

  it("keeps every ratio inside the Classic window", () => {
    for (let i = 0; i < 200; i += 1) {
      for (const round of generateGameRounds({ pokemon, seed: `ratio-${i}` })) {
        const ratio = round.target.heightMeters / round.reference.heightMeters;
        expect(ratio).toBeGreaterThanOrEqual(MIN_CLASSIC_RATIO);
        expect(ratio).toBeLessThanOrEqual(MAX_CLASSIC_RATIO);
      }
    }
  });

  it("never reuses a Pokémon within one game, in either role", () => {
    for (let i = 0; i < 200; i += 1) {
      const rounds = generateGameRounds({ pokemon, seed: `unique-${i}` });
      const ids = rounds.flatMap((round) => [round.reference.id, round.target.id]);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("starts the target away from the answer", () => {
    for (let i = 0; i < 200; i += 1) {
      for (const round of generateGameRounds({ pokemon, seed: `scale-${i}` })) {
        expect(round.initialTargetScale).toBeGreaterThanOrEqual(INITIAL_SCALE_MIN);
        expect(round.initialTargetScale).toBeLessThanOrEqual(INITIAL_SCALE_MAX);
        expect(Math.abs(round.initialTargetScale - 1)).toBeGreaterThan(0.029);
      }
    }
  });

  it("varies the ratios inside a single game", () => {
    let gamesWithSpread = 0;
    const samples = 60;

    for (let i = 0; i < samples; i += 1) {
      const ratios = generateGameRounds({ pokemon, seed: `spread-${i}` }).map(
        (round) => round.target.heightMeters / round.reference.heightMeters,
      );
      const spread = Math.max(...ratios) - Math.min(...ratios);
      if (spread > 0.5) gamesWithSpread += 1;
    }

    expect(gamesWithSpread).toBeGreaterThan(samples * 0.9);
  });

  it("ignores Pokémon with invalid heights", () => {
    const poisoned = [
      makePokemon({ id: 900, heightMeters: 1 }),
      makePokemon({ id: 901, heightMeters: 1.5 }),
      makePokemon({ id: 902, heightMeters: 0 }),
      makePokemon({ id: 903, heightMeters: Number.NaN }),
      makePokemon({ id: 904, heightMeters: Number.POSITIVE_INFINITY }),
      makePokemon({ id: 905, heightMeters: -2 }),
    ];

    const rounds = generateGameRounds({ pokemon: poisoned, count: 1, seed: "poison" });
    for (const round of rounds) {
      expect([900, 901]).toContain(round.reference.id);
      expect([900, 901]).toContain(round.target.id);
    }
  });

  it("is deterministic for a given seed and varies without one", () => {
    const a = generateGameRounds({ pokemon, seed: "daily-2026-08-27" });
    const b = generateGameRounds({ pokemon, seed: "daily-2026-08-27" });
    expect(a.map((round) => round.id)).toEqual(b.map((round) => round.id));
    expect(a.map((round) => round.initialTargetScale)).toEqual(
      b.map((round) => round.initialTargetScale),
    );

    const c = generateGameRounds({ pokemon, seed: "daily-2026-08-28" });
    expect(a.map((round) => round.id)).not.toEqual(c.map((round) => round.id));
  });

  it("terminates instead of looping when no legal pair exists", () => {
    const impossible = [
      makePokemon({ id: 800, heightMeters: 0.1 }),
      makePokemon({ id: 801, heightMeters: 20 }),
    ];
    expect(generateGameRounds({ pokemon: impossible, seed: "impossible" })).toHaveLength(0);
    expect(generateGameRounds({ pokemon: [], seed: "empty" })).toHaveLength(0);
    expect(generateGameRounds({ pokemon: [makePokemon({ id: 1 })], seed: "one" })).toHaveLength(0);
  });

  it("only produces rounds that fit the stage it was given", () => {
    for (const [width, height] of [
      [1040, 560],
      [700, 480],
      [358, 400],
      [288, 360],
    ] as const) {
      const stage = resolveStageMetrics(width, height);
      for (let i = 0; i < 40; i += 1) {
        const rounds = generateGameRounds({ pokemon, seed: `fit-${width}-${i}`, stage });
        expect(rounds).toHaveLength(ROUNDS_PER_GAME);
        for (const round of rounds) {
          expect(roundFitsStage(round, stage)).toBe(true);
        }
      }
    }
  });

  it("honours a custom round count", () => {
    expect(generateGameRounds({ pokemon, count: 3, seed: "three" })).toHaveLength(3);
    expect(generateGameRounds({ pokemon, count: 0, seed: "zero" })).toHaveLength(ROUNDS_PER_GAME);
  });
});
