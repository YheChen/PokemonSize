"use client";

import { figureWidth, type Pokemon } from "@/lib/pokemon";

export type FigureVariant = "silhouette" | "color" | "ghost";

interface PokemonFigureProps {
  pokemon: Pokemon;
  /** Exact visible height in CSS pixels — the single source of scale truth. */
  pixelHeight: number;
  variant: FigureVariant;
  /** Rendered on top of siblings; used to keep the guess above its ghost. */
  layer?: number;
  className?: string;
}

/**
 * Draws one Pokémon at an exact visible height.
 *
 * Sprites are alpha-cropped by the asset pipeline, so the image fills its box
 * edge to edge and the box height *is* the Pokémon's on-screen height. The box
 * is sized in CSS pixels rather than scaled with a transform, so the number the
 * game scores is the number the player sees.
 */
export function PokemonFigure({
  pokemon,
  pixelHeight,
  variant,
  layer = 1,
  className = "",
}: PokemonFigureProps) {
  const height = Math.max(0, pixelHeight);
  const width = figureWidth(pokemon, height);

  return (
    <div
      className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${className}`}
      style={{ height, width, zIndex: layer }}
      aria-hidden={variant === "ghost" ? true : undefined}
    >
      {variant === "ghost" ? (
        <div
          className={`pokescale-ghost ${layer > 2 ? "pokescale-ghost--front" : ""}`}
          style={{
            maskImage: `url("${pokemon.image}")`,
            WebkitMaskImage: `url("${pokemon.image}")`,
          }}
        />
      ) : (
        <img
          // Keyed per Pokémon so a new round mounts a fresh node instead of
          // inheriting the previous round's in-flight reveal transition.
          key={pokemon.id}
          src={pokemon.image}
          alt=""
          width={pokemon.imageWidth}
          height={pokemon.imageHeight}
          draggable={false}
          decoding="async"
          className={
            variant === "silhouette"
              ? "pokescale-art pokescale-silhouette"
              : // Only the reveal animates; dropping back to a silhouette must
                // be instant or the next round briefly shows the answer in colour.
                "pokescale-art pokescale-reveal-art"
          }
        />
      )}
    </div>
  );
}
