export const ROUNDS_PER_GAME = 5;
export const MAX_ROUND_SCORE = 1000;
export const MAX_GAME_SCORE = ROUNDS_PER_GAME * MAX_ROUND_SCORE;

/**
 * Classic pairs stay inside 0.25×–2.45×, a ~10× spread that still lets both
 * Pokémon share the stage. The upper bound is deliberately tied to the layout
 * constants below: REFERENCE_STAGE_FRACTION * MAX_CLASSIC_RATIO stays under
 * STAGE_HEADROOM, so even a largest-legal target fits without overflowing.
 * Widening the window would shrink the reference for every other round.
 */
export const MIN_CLASSIC_RATIO = 0.25;
export const MAX_CLASSIC_RATIO = 2.45;

/** Share of the stage height given to the reference Pokémon. */
export const REFERENCE_STAGE_FRACTION = 0.38;
/** Share of the stage height a figure may occupy, leaving room for the grip. */
export const STAGE_HEADROOM = 0.94;
export const REFERENCE_PIXEL_MAX = 300;
export const MIN_TARGET_PIXEL_HEIGHT = 12;

/**
 * Horizontal budget. The reference plus a largest-legal target need
 * (1 + MAX_CLASSIC_RATIO) reference-heights of width when both are roughly
 * square, so the reference is capped at that share of the usable width. This
 * depends only on the stage, never on the round, so it cannot hint at the
 * answer.
 */
export const REFERENCE_WIDTH_DIVISOR = 1 + MAX_CLASSIC_RATIO;
export const FIGURE_GAP_FRACTION = 0.045;
export const FIGURE_GAP_MIN = 16;

/**
 * On tall, narrow screens the width budget caps the scene long before the
 * height budget does, leaving a column of unusable sky. Capping stage height
 * against its own width keeps the playfield compact without touching any of
 * the scale maths, which only ever reads the smaller of the two budgets.
 */
export const STAGE_MAX_HEIGHT_PER_WIDTH = 0.8;

/** How far off the target starts, so the opening size never leaks the answer. */
export const INITIAL_SCALE_MIN = 0.6;
export const INITIAL_SCALE_MAX = 1.5;
/** Opening sizes this close to correct are pushed away. */
export const INITIAL_SCALE_DEAD_ZONE = 0.03;

export const KEYBOARD_STEP = 2;
export const KEYBOARD_STEP_LARGE = 10;

export const MAX_ROUND_GENERATION_ATTEMPTS = 400;
