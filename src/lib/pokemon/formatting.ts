/** Human-readable height. Display only — scoring always stays in metres. */
export function formatHeight(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  if (meters < 1) return `${Math.round(meters * 100)} cm`;
  return `${meters.toFixed(meters < 10 ? 1 : 0)} m`;
}

/** Two-decimal metres, for side-by-side guess/actual comparisons. */
export function formatHeightPrecise(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "—";
  return `${meters.toFixed(2)} m`;
}

export function formatScore(score: number): string {
  if (!Number.isFinite(score)) return "0";
  return Math.round(score).toLocaleString("en-US");
}

export function formatAccuracy(accuracy: number): string {
  if (!Number.isFinite(accuracy) || accuracy < 0) return "0.0%";
  const percent = Math.min(accuracy, 1) * 100;
  return `${percent >= 99.95 ? "100" : percent.toFixed(1)}%`;
}

/** "You made Pikachu 1.30× too big." */
export function describeMiss(displayName: string, ratioError: number): string {
  if (!Number.isFinite(ratioError) || ratioError <= 0) return "";
  if (Math.abs(ratioError - 1) < 0.005) return `You nailed ${displayName} exactly.`;
  if (ratioError > 1) return `You made ${displayName} ${ratioError.toFixed(2)}× too big.`;
  return `You made ${displayName} ${(1 / ratioError).toFixed(2)}× too small.`;
}
