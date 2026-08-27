import { describe, expect, it } from "vitest";
import {
  describeMiss,
  formatAccuracy,
  formatHeight,
  formatHeightPrecise,
  formatScore,
} from "./formatting";

describe("formatHeight", () => {
  it("uses centimetres below a metre and metres above", () => {
    expect(formatHeight(0.4)).toBe("40 cm");
    expect(formatHeight(0.1)).toBe("10 cm");
    expect(formatHeight(1.7)).toBe("1.7 m");
    expect(formatHeight(9.9)).toBe("9.9 m");
    expect(formatHeight(14.5)).toBe("15 m");
    expect(formatHeight(20)).toBe("20 m");
  });

  it("never renders NaN, Infinity or undefined", () => {
    expect(formatHeight(Number.NaN)).toBe("-");
    expect(formatHeight(Number.POSITIVE_INFINITY)).toBe("-");
    expect(formatHeight(0)).toBe("-");
    expect(formatHeight(-1)).toBe("-");
    expect(formatHeightPrecise(Number.NaN)).toBe("-");
  });
});

describe("formatAccuracy and formatScore", () => {
  it("formats percentages and thousands", () => {
    expect(formatAccuracy(1)).toBe("100%");
    expect(formatAccuracy(0.769)).toBe("76.9%");
    expect(formatAccuracy(0)).toBe("0.0%");
    expect(formatAccuracy(Number.NaN)).toBe("0.0%");
    expect(formatScore(4237)).toBe("4,237");
    expect(formatScore(Number.NaN)).toBe("0");
  });
});

describe("describeMiss", () => {
  it("describes the direction of the error", () => {
    expect(describeMiss("Pikachu", 1.3)).toBe("You made Pikachu 1.30× too big.");
    expect(describeMiss("Pikachu", 0.5)).toBe("You made Pikachu 2.00× too small.");
    expect(describeMiss("Pikachu", 1)).toBe("You nailed Pikachu exactly.");
    expect(describeMiss("Pikachu", Number.NaN)).toBe("");
  });
});
