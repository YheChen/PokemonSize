export interface Pokemon {
  id: number;
  name: string;
  displayName: string;
  heightDecimeters: number;
  heightMeters: number;
  image: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number;
  generation?: number;
}

export interface Round {
  id: string;
  reference: Pokemon;
  target: Pokemon;
  /**
   * How far the target starts from its correct size, as a multiplier.
   * Stored ratio-first so the opening size survives viewport changes.
   */
  initialTargetScale: number;
}

export interface RoundResult {
  roundId: string;
  referencePokemonId: number;
  targetPokemonId: number;
  guessedHeightMeters: number;
  actualHeightMeters: number;
  guessedPixelHeight: number;
  correctPixelHeight: number;
  /** guessed / actual. Above 1 means the player made it too big. */
  ratioError: number;
  accuracy: number;
  score: number;
}

/** Real-world size band, used only to pick how big to draw a reference. */
export type SizeTier = "xs" | "s" | "m" | "l" | "xl";

export type GamePhase = "landing" | "guessing" | "revealed" | "results";

export type GameMode = "classic";

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  rounds: Round[];
  currentRoundIndex: number;
  results: RoundResult[];
}

/** Pixel geometry derived from the measured stage. Round-independent. */
export interface StageMetrics {
  width: number;
  height: number;
  /** Horizontal space left for the two figures once the gap is removed. */
  usableWidth: number;
  gap: number;
  referencePixelHeight: number;
  minTargetPixelHeight: number;
  /** Ceiling from stage height alone; a round may be tighter horizontally. */
  maxTargetPixelHeight: number;
}
