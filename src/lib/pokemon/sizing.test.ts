import { describe, expect, it } from "vitest";
import {
  MAX_CLASSIC_RATIO,
  REFERENCE_PIXEL_MAX,
  REFERENCE_STAGE_FRACTION,
  REFERENCE_TIER_SCALE,
  STAGE_HEADROOM,
} from "./constants";
import {
  calculateCorrectPixelHeight,
  calculateGuessedHeightMeters,
  calculateRatioError,
  calculateReferencePixelHeight,
  clamp,
  figureWidth,
  maxTargetHeightForRound,
  referencePixelHeightFor,
  resolveStageMetrics,
  roundFitsStage,
  sizeTier,
} from "./sizing";
import type { Pokemon, Round } from "./types";

function mon(overrides: Partial<Pokemon>): Pokemon {
  return {
    id: 1,
    name: "mon",
    displayName: "Mon",
    heightDecimeters: 10,
    heightMeters: 1,
    image: "/pokemon/normalized/1.png",
    imageWidth: 100,
    imageHeight: 100,
    aspectRatio: 1,
    ...overrides,
  };
}

function testRound(referenceMeters: number, targetMeters: number, targetAspect = 1): Round {
  return {
    id: "fit",
    reference: mon({ id: 1, heightMeters: referenceMeters }),
    target: mon({ id: 2, heightMeters: targetMeters, aspectRatio: targetAspect }),
    initialTargetScale: 1.2,
  };
}

describe("calculateCorrectPixelHeight", () => {
  it("scales the reference by the real-world height ratio", () => {
    expect(
      calculateCorrectPixelHeight({
        referenceHeightMeters: 1.7,
        targetHeightMeters: 0.4,
        referencePixelHeight: 300,
      }),
    ).toBeCloseTo(70.588, 3);
  });

  it("is the exact inverse of the guess conversion", () => {
    const referenceHeightMeters = 1.7;
    const referencePixelHeight = 300;
    const targetHeightMeters = 2.4;

    const pixels = calculateCorrectPixelHeight({
      referenceHeightMeters,
      targetHeightMeters,
      referencePixelHeight,
    });

    expect(
      calculateGuessedHeightMeters({
        referenceHeightMeters,
        referencePixelHeight,
        guessedPixelHeight: pixels,
      }),
    ).toBeCloseTo(targetHeightMeters, 10);
  });

  it("returns 0 rather than NaN for degenerate input", () => {
    expect(
      calculateCorrectPixelHeight({
        referenceHeightMeters: 0,
        targetHeightMeters: 1,
        referencePixelHeight: 300,
      }),
    ).toBe(0);
    expect(
      calculateCorrectPixelHeight({
        referenceHeightMeters: Number.NaN,
        targetHeightMeters: 1,
        referencePixelHeight: 300,
      }),
    ).toBe(0);
    expect(
      calculateCorrectPixelHeight({
        referenceHeightMeters: 1,
        targetHeightMeters: Number.POSITIVE_INFINITY,
        referencePixelHeight: 300,
      }),
    ).toBe(0);
  });
});

describe("calculateGuessedHeightMeters", () => {
  it("converts a dragged pixel height back to metres", () => {
    expect(
      calculateGuessedHeightMeters({
        referenceHeightMeters: 1.7,
        referencePixelHeight: 300,
        guessedPixelHeight: 100,
      }),
    ).toBeCloseTo(0.5667, 4);
  });

  it("returns 0 rather than NaN for degenerate input", () => {
    expect(
      calculateGuessedHeightMeters({
        referenceHeightMeters: 1.7,
        referencePixelHeight: 0,
        guessedPixelHeight: 100,
      }),
    ).toBe(0);
    expect(
      calculateGuessedHeightMeters({
        referenceHeightMeters: 1.7,
        referencePixelHeight: 300,
        guessedPixelHeight: -5,
      }),
    ).toBe(0);
  });
});

describe("stage geometry", () => {
  it("derives the reference height only from the stage, never the round", () => {
    // Wide stage: the height budget binds.
    expect(calculateReferencePixelHeight(600, 4000)).toBeCloseTo(600 * REFERENCE_STAGE_FRACTION, 10);
    // Narrow stage: the width budget binds.
    expect(calculateReferencePixelHeight(600, 210)).toBeCloseTo(210 / (1 + MAX_CLASSIC_RATIO), 10);
    expect(calculateReferencePixelHeight(5000, 40000)).toBe(REFERENCE_PIXEL_MAX);
    expect(calculateReferencePixelHeight(0, 500)).toBe(0);
    expect(calculateReferencePixelHeight(Number.NaN, 500)).toBe(0);
  });

  it("always leaves room for the largest legal target", () => {
    for (const [stageWidth, stageHeight] of [
      [1040, 560],
      [880, 520],
      [700, 480],
      [358, 400],
      [288, 360],
      [900, 280],
      [2000, 1200],
    ] as const) {
      const metrics = resolveStageMetrics(stageWidth, stageHeight);
      const largestCorrect = metrics.referencePixelHeight * MAX_CLASSIC_RATIO;

      // Fits vertically...
      expect(largestCorrect).toBeLessThanOrEqual(metrics.maxTargetPixelHeight + 1e-9);
      expect(metrics.maxTargetPixelHeight).toBeLessThanOrEqual(stageHeight * STAGE_HEADROOM + 1e-9);
      // ...and side by side with the reference, for square-ish figures.
      expect(metrics.referencePixelHeight + largestCorrect).toBeLessThanOrEqual(
        metrics.usableWidth + 1e-9,
      );
      expect(metrics.usableWidth + metrics.gap).toBeCloseTo(stageWidth, 6);
    }
  });

  it("survives an unmeasured stage", () => {
    const metrics = resolveStageMetrics(0, 0);
    expect(metrics.referencePixelHeight).toBe(0);
    expect(metrics.usableWidth).toBe(0);
    expect(Number.isFinite(metrics.maxTargetPixelHeight)).toBe(true);
    expect(metrics.maxTargetPixelHeight).toBeGreaterThan(0);
  });

  it("keeps the drag ceiling inside the width the reference leaves behind", () => {
    const metrics = resolveStageMetrics(700, 480);
    const wide = testRound(1, 2, 2.6);
    const square = testRound(1, 2, 1);

    const referenceWidth = figureWidth(wide.reference, referencePixelHeightFor(wide, metrics));
    expect(maxTargetHeightForRound(wide, metrics)).toBeLessThan(
      maxTargetHeightForRound(square, metrics),
    );
    expect(
      figureWidth(wide.target, maxTargetHeightForRound(wide, metrics)) + referenceWidth,
    ).toBeLessThanOrEqual(metrics.usableWidth + 1e-6);
  });

  it("rejects rounds whose answer could not be shown", () => {
    const metrics = resolveStageMetrics(700, 480);
    expect(roundFitsStage(testRound(1, 1), metrics)).toBe(true);
    // 8× taller is far outside the Classic window and cannot fit.
    expect(roundFitsStage(testRound(1, 8), metrics)).toBe(false);
    expect(roundFitsStage(testRound(1, 1), resolveStageMetrics(0, 0))).toBe(false);
  });

  it("measures figure width from the normalized aspect ratio", () => {
    expect(figureWidth(mon({ aspectRatio: 1.5 }), 200)).toBe(300);
    expect(figureWidth(mon({ aspectRatio: 1.5 }), 0)).toBe(0);
    expect(figureWidth(mon({ aspectRatio: Number.NaN }), 200)).toBe(0);
  });
});

describe("reference size tiers", () => {
  it("bands heights the way the labels imply", () => {
    expect(sizeTier(0.1)).toBe("xs"); // Joltik
    expect(sizeTier(0.4)).toBe("xs"); // Pikachu
    expect(sizeTier(0.6)).toBe("s"); // Charmander
    expect(sizeTier(1.5)).toBe("m"); // about human height
    expect(sizeTier(2.1)).toBe("l"); // Snorlax
    expect(sizeTier(14.5)).toBe("xl"); // Wailord
  });

  it("orders the tiers by size and never scales a reference up", () => {
    const order = ["xs", "s", "m", "l", "xl"] as const;
    for (let i = 1; i < order.length; i += 1) {
      expect(REFERENCE_TIER_SCALE[order[i]!]).toBeGreaterThan(REFERENCE_TIER_SCALE[order[i - 1]!]);
    }
    for (const tier of order) {
      expect(REFERENCE_TIER_SCALE[tier]).toBeGreaterThan(0);
      // Scaling only ever down is what preserves the fit guarantee for free.
      expect(REFERENCE_TIER_SCALE[tier]).toBeLessThanOrEqual(1);
    }
  });

  it("draws a bigger reference for a bigger Pokémon", () => {
    const metrics = resolveStageMetrics(1040, 560);
    const joltik = referencePixelHeightFor(testRound(0.1, 0.15), metrics);
    const human = referencePixelHeightFor(testRound(1.5, 2), metrics);
    const wailord = referencePixelHeightFor(testRound(14.5, 20), metrics);

    expect(joltik).toBeLessThan(human);
    expect(human).toBeLessThan(wailord);
    expect(wailord).toBeLessThanOrEqual(metrics.referencePixelHeight + 1e-9);
  });

  it("still fits a largest-legal target at every tier", () => {
    for (const [width, height] of [
      [1040, 560],
      [700, 480],
      [358, 400],
      [288, 360],
    ] as const) {
      const metrics = resolveStageMetrics(width, height);
      for (const referenceMeters of [0.1, 0.6, 1.5, 2.1, 14.5]) {
        const round = testRound(referenceMeters, referenceMeters * MAX_CLASSIC_RATIO);
        const referencePixelHeight = referencePixelHeightFor(round, metrics);
        expect(referencePixelHeight * MAX_CLASSIC_RATIO).toBeLessThanOrEqual(
          metrics.maxTargetPixelHeight + 1e-9,
        );
        expect(roundFitsStage(round, metrics)).toBe(true);
      }
    }
  });

  it("falls back to the middle tier for unusable heights", () => {
    expect(sizeTier(Number.NaN)).toBe("m");
    expect(sizeTier(0)).toBe("m");
    expect(sizeTier(-1)).toBe("m");
  });
});

describe("clamp", () => {
  it("bounds values and rejects non-finite input", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
    expect(clamp(Number.NaN, 3, 10)).toBe(3);
    expect(clamp(Number.POSITIVE_INFINITY, 3, 10)).toBe(10);
    expect(clamp(5, 10, 0)).toBe(10);
  });
});

describe("calculateRatioError", () => {
  it("reports how many times too big the guess was", () => {
    expect(calculateRatioError(1.3, 1)).toBeCloseTo(1.3, 10);
    expect(calculateRatioError(0.5, 1)).toBeCloseTo(0.5, 10);
    expect(calculateRatioError(0, 1)).toBe(0);
    expect(calculateRatioError(1, 0)).toBe(0);
  });
});
