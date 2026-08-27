import { describe, expect, it } from "vitest";
import {
  accuracyEmoji,
  accuracyLabel,
  accuracyTier,
  accuracyToScore,
  calculateAccuracy,
} from "./scoring";
import { MAX_ROUND_SCORE } from "./constants";

describe("calculateAccuracy", () => {
  it("is perfect for an exact guess", () => {
    expect(calculateAccuracy(1, 1)).toBe(1);
  });

  it("is multiplicatively symmetric", () => {
    expect(calculateAccuracy(2, 1)).toBeCloseTo(0.5, 10);
    expect(calculateAccuracy(0.5, 1)).toBeCloseTo(0.5, 10);
  });

  it("scores relative error, not absolute error", () => {
    // Both guesses are 10% too big despite very different absolute misses.
    expect(calculateAccuracy(1.1, 1)).toBeCloseTo(calculateAccuracy(11, 10), 10);
    expect(calculateAccuracy(1.1, 1)).toBeCloseTo(1 / 1.1, 10);
  });

  it("stays within 0 and 1 for every ratio", () => {
    for (const [guess, actual] of [
      [0.1, 20],
      [20, 0.1],
      [3, 7],
      [14.5, 0.2],
    ] as const) {
      const accuracy = calculateAccuracy(guess, actual);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    }
  });

  it("returns 0 for degenerate input instead of NaN", () => {
    for (const [guess, actual] of [
      [0, 1],
      [1, 0],
      [-1, 1],
      [1, -1],
      [Number.NaN, 1],
      [1, Number.NaN],
      [Number.POSITIVE_INFINITY, 1],
      [1, Number.POSITIVE_INFINITY],
    ] as const) {
      expect(calculateAccuracy(guess, actual)).toBe(0);
    }
  });
});

describe("accuracyToScore", () => {
  it("caps a round at 1000 points", () => {
    expect(accuracyToScore(1)).toBe(MAX_ROUND_SCORE);
    expect(accuracyToScore(2)).toBe(MAX_ROUND_SCORE);
  });

  it("follows the squared curve from the spec", () => {
    expect(accuracyToScore(0.95)).toBe(903);
    expect(accuracyToScore(0.9)).toBe(810);
    expect(accuracyToScore(0.8)).toBe(640);
    expect(accuracyToScore(0.7)).toBe(490);
    expect(accuracyToScore(0.5)).toBe(250);
  });

  it("never returns a negative or non-finite score", () => {
    expect(accuracyToScore(0)).toBe(0);
    expect(accuracyToScore(-3)).toBe(0);
    expect(accuracyToScore(Number.NaN)).toBe(0);
    expect(accuracyToScore(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("rewards precision more steeply than mediocrity", () => {
    const nearMiss = accuracyToScore(1) - accuracyToScore(0.9);
    const farMiss = accuracyToScore(0.6) - accuracyToScore(0.5);
    expect(nearMiss).toBeGreaterThan(farMiss);
  });
});

describe("labels", () => {
  it("maps accuracy onto friendly copy", () => {
    expect(accuracyLabel(1)).toBe("Perfect!");
    expect(accuracyLabel(0.96)).toBe("Incredible");
    expect(accuracyLabel(0.91)).toBe("So close");
    expect(accuracyLabel(0.82)).toBe("Pretty good");
    expect(accuracyLabel(0.7)).toBe("Not bad");
    expect(accuracyLabel(0.55)).toBe("A little off");
    expect(accuracyLabel(0.2)).toBe("Way off");
    expect(accuracyLabel(Number.NaN)).toBe("Way off");
  });

  it("maps accuracy onto share emoji buckets", () => {
    expect(accuracyEmoji(0.99)).toBe("🟩");
    expect(accuracyEmoji(0.9)).toBe("🟨");
    expect(accuracyEmoji(0.75)).toBe("🟧");
    expect(accuracyEmoji(0.4)).toBe("🟥");
  });

  it("maps accuracy onto tiers", () => {
    expect(accuracyTier(0.99)).toBe("great");
    expect(accuracyTier(0.88)).toBe("good");
    expect(accuracyTier(0.72)).toBe("fair");
    expect(accuracyTier(0.1)).toBe("poor");
  });
});
