# PokéScale

**How big are Pokémon, really?**

A browser game about scale. You get two Pokémon standing on the same ground
line: one at a fixed reference size, one as a silhouette you can resize by
dragging. Make the silhouette the size you think it really is next to the
reference, lock it in, and find out how close you were. Five rounds, 5,000
points.

No numbers to type, no accounts, no backend. The whole game is static.

## How to Play

1. Press **Play**.
2. Drag the grip at the target's upper-right corner: right or up to grow,
   left or down to shrink. The slider and `−` / `+` buttons do the same job,
   and arrow keys work when the grip is focused (`Shift` for bigger steps).
3. Press **Lock it in**.
4. The reveal shows your guess, the true height, your accuracy, and a
   translucent ghost of the correct size on the same baseline.
5. After round five you get a total and a spoiler-free share grid.

Scoring is proportional, so guessing 2× too big and 2× too small are equally
wrong no matter how large the Pokémon is.

## Local Development

```bash
pnpm install
pnpm dev
```

The generated dataset and normalized sprites are committed, so ordinary
development never needs to rebuild assets.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build (fully static) |
| `pnpm test` | Unit tests for the scale, scoring and round-generation logic |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm run build:pokemon` | Rebuild the Pokémon dataset and sprites |

## Pokémon Asset Pipeline

`scripts/build-pokemon-assets.ts` fetches every default-form species from
PokéAPI, downloads its official artwork, and, most importantly,
**crops each sprite to the bounding box of its non-transparent pixels**.

This is not a file-size optimisation. Source artwork carries different amounts
of transparent padding, so two untouched images rendered at the same CSS height
would show bodies of visibly different sizes and every comparison in the game
would be quietly wrong. After cropping, an image fills its box edge to edge, so
the box height *is* the Pokémon's on-screen height.

```bash
pnpm run build:pokemon                 # all 1,025 default-form species
pnpm run build:pokemon -- --limit=151  # Generation I only
pnpm run build:pokemon -- --force      # ignore the on-disk HTTP cache
```

Outputs `public/pokemon/normalized/<id>.png` and `src/data/pokemon.generated.json`.
Responses are cached in `.pokemon-cache/` (gitignored), so re-runs are fast.
Records with a missing sprite or a non-positive height are dropped rather than
shipped.

## Architecture

```
src/
  app/                     layout, page, global styles
  components/game/         PokeScaleGame (state) + presentational pieces
  hooks/                   useElementSize, usePointerResize
  lib/pokemon/             all scale, scoring and round logic, no React
  data/                    pokemon.generated.json
scripts/                   asset pipeline
```

`src/lib/pokemon` is pure and framework-free, which is why the maths is the
part that's unit-tested. `PokeScaleGame` owns the only mutable game state and
everything below it is presentational.

### The scale rules

Two invariants keep the game honest:

- **Figures are sized, never scaled.** Each figure's box gets an explicit pixel
  height and a width derived from the sprite's aspect ratio. No
  `transform: scale()`, so what is measured is what is drawn.
- **Reference size never depends on the round.** It is a function of the stage
  alone:

  ```
  referencePixelHeight = min(
    stageHeight × 0.38,                        // vertical budget
    usableWidth  ÷ (1 + MAX_CLASSIC_RATIO),    // horizontal budget
    300
  )
  ```

  If the reference shrank when the answer happened to be large, its size would
  leak the answer. Because both terms are round-independent, it can't.

Round generation is handed the measured stage and only emits pairs whose
correct size is reachable and fully visible on it, so the answer is always
something the player can actually reach. Classic pairs sit between 0.25× and
2.45×; that ceiling is tied to the layout constants above, and widening it
would shrink the reference in every other round.

`generateGameRounds` accepts an optional `seed` and is fully deterministic,
which is what a daily challenge would need later.

## Scoring

```ts
accuracy = min(guess / actual, actual / guess)   // 0…1, symmetric
score    = round(1000 × accuracy²)               // max 1000 per round
```

The squared curve means precision pays: 95% accuracy scores 903, but 80%
scores only 640. A perfect game is 5,000.

Share grids bucket accuracy into 🟩 ≥95%, 🟨 ≥85%, 🟧 ≥70%, 🟥 below, and
deliberately name no Pokémon, so sharing a result spoils nothing.

## Deployment

Static output with no runtime dependencies, so any host works. On Vercel,
import the repository and accept the defaults: no environment variables, no
database, no serverless functions.

```bash
pnpm build && pnpm start   # production build locally
```

---

PokéScale is an unofficial fan project. Pokémon names, artwork and characters
belong to their respective owners. Sprite and species data come from
[PokéAPI](https://pokeapi.co).
