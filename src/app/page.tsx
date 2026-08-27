import dataset from "@/data/pokemon.generated.json";
import { PokeScaleGame } from "@/components/game/PokeScaleGame";
import { filterPlayablePokemon } from "@/lib/pokemon";
import type { Pokemon } from "@/lib/pokemon";

export default function Home() {
  // Validated once at build time so the client never has to defend against
  // malformed records mid-game.
  const pokemon = filterPlayablePokemon(dataset as Pokemon[]);

  return <PokeScaleGame pokemon={pokemon} />;
}
