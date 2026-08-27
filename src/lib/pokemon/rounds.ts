import {
  INITIAL_SCALE_DEAD_ZONE,
  INITIAL_SCALE_MAX,
  INITIAL_SCALE_MIN,
  MAX_CLASSIC_RATIO,
  MAX_ROUND_GENERATION_ATTEMPTS,
  MIN_CLASSIC_RATIO,
  ROUNDS_PER_GAME,
} from "./constants";
import { createRng, shuffle, type Rng } from "./random";
import { roundFitsStage } from "./sizing";
import type { Pokemon, Round, StageMetrics } from "./types";

/**
 * Size relationships a round can showcase. Weights shape a five-round game so
 * players get a mix rather than five near-identical comparisons.
 */
interface RatioBucket {
  key: string;
  min: number;
  max: number;
  weight: number;
}

const RATIO_BUCKETS: readonly RatioBucket[] = [
  { key: "much-smaller", min: MIN_CLASSIC_RATIO, max: 0.5, weight: 0.2 },
  { key: "moderately-smaller", min: 0.5, max: 0.85, weight: 0.3 },
  { key: "similar", min: 0.85, max: 1.2, weight: 0.2 },
  { key: "moderately-larger", min: 1.2, max: MAX_CLASSIC_RATIO, weight: 0.3 },
];

/** At most this many rounds may come from the same bucket in one game. */
const MAX_ROUNDS_PER_BUCKET = 2;

export function isPlayablePokemon(pokemon: Pokemon): boolean {
  return (
    Number.isFinite(pokemon.heightMeters) &&
    pokemon.heightMeters > 0 &&
    Number.isFinite(pokemon.aspectRatio) &&
    pokemon.aspectRatio > 0 &&
    typeof pokemon.image === "string" &&
    pokemon.image.length > 0
  );
}

export function filterPlayablePokemon(pokemon: readonly Pokemon[]): Pokemon[] {
  return pokemon.filter(isPlayablePokemon);
}

function planBuckets(count: number, rng: Rng): RatioBucket[] {
  const used = new Map<string, number>();
  const plan: RatioBucket[] = [];

  for (let i = 0; i < count; i += 1) {
    const available = RATIO_BUCKETS.filter(
      (bucket) => (used.get(bucket.key) ?? 0) < MAX_ROUNDS_PER_BUCKET,
    );
    const pool = available.length > 0 ? available : RATIO_BUCKETS;
    const totalWeight = pool.reduce((sum, bucket) => sum + bucket.weight, 0);

    let roll = rng.next() * totalWeight;
    let chosen = pool[pool.length - 1] as RatioBucket;
    for (const bucket of pool) {
      roll -= bucket.weight;
      if (roll <= 0) {
        chosen = bucket;
        break;
      }
    }

    used.set(chosen.key, (used.get(chosen.key) ?? 0) + 1);
    plan.push(chosen);
  }

  return shuffle(plan, rng);
}

/**
 * Starting size for the target: deliberately wrong, and never so close to the
 * answer that the opening position does the player's work for them.
 */
function rollInitialScale(rng: Rng): number {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const scale = rng.between(INITIAL_SCALE_MIN, INITIAL_SCALE_MAX);
    if (Math.abs(scale - 1) > INITIAL_SCALE_DEAD_ZONE) return scale;
  }
  return rng.next() < 0.5
    ? 1 - INITIAL_SCALE_DEAD_ZONE * 2
    : 1 + INITIAL_SCALE_DEAD_ZONE * 2;
}

export interface GenerateRoundsOptions {
  pokemon: readonly Pokemon[];
  count?: number;
  seed?: string;
  /**
   * When supplied, every generated round is guaranteed to fit: the correct
   * target size stays reachable and fully visible on this stage.
   */
  stage?: StageMetrics;
}

/**
 * Builds a playable game. Every pair is guaranteed to sit inside the Classic
 * ratio window, and no Pokémon appears twice in the same game, as reference or
 * as target, so nothing carries over between rounds.
 */
export function generateGameRounds({
  pokemon,
  count = ROUNDS_PER_GAME,
  seed,
  stage,
}: GenerateRoundsOptions): Round[] {
  const roundCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : ROUNDS_PER_GAME;
  const pool = filterPlayablePokemon(pokemon);
  if (pool.length < 2) return [];

  const rng = createRng(seed);
  const plan = planBuckets(roundCount, rng);
  const rounds: Round[] = [];
  const usedIds = new Set<number>();

  for (let index = 0; index < roundCount; index += 1) {
    const bucket = plan[index] as RatioBucket;
    const round = findRound(pool, usedIds, bucket, rng, index, seed, stage);
    if (!round) break;

    usedIds.add(round.reference.id);
    usedIds.add(round.target.id);
    rounds.push(round);
  }

  return rounds;
}

function findRound(
  pool: readonly Pokemon[],
  usedIds: ReadonlySet<number>,
  bucket: RatioBucket,
  rng: Rng,
  index: number,
  seed: string | undefined,
  stage: StageMetrics | undefined,
): Round | null {
  // Two passes: honour the planned bucket first, then accept any legal pair
  // rather than leaving the player with fewer than the promised rounds.
  const passes: Array<{ min: number; max: number }> = [
    { min: bucket.min, max: bucket.max },
    { min: MIN_CLASSIC_RATIO, max: MAX_CLASSIC_RATIO },
  ];

  for (const pass of passes) {
    for (let attempt = 0; attempt < MAX_ROUND_GENERATION_ATTEMPTS; attempt += 1) {
      const reference = rng.pick(pool);
      const target = rng.pick(pool);
      if (!reference || !target) return null;
      if (reference.id === target.id) continue;
      if (usedIds.has(reference.id) || usedIds.has(target.id)) continue;

      const ratio = target.heightMeters / reference.heightMeters;
      if (!Number.isFinite(ratio)) continue;
      if (ratio < pass.min || ratio > pass.max) continue;

      const candidate: Round = {
        id: `${seed ?? "r"}-${index}-${reference.id}-${target.id}`,
        reference,
        target,
        initialTargetScale: rollInitialScale(rng),
      };

      if (stage && !roundFitsStage(candidate, stage)) continue;
      return candidate;
    }
  }

  return null;
}
