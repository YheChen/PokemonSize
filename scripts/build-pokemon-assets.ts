/**
 * Builds the local PokéScale dataset.
 *
 * The game compares *visible* Pokémon height, so every sprite is cropped down to
 * the bounding box of its non-transparent pixels. Without this step two images
 * rendered at the same CSS height would show bodies of different sizes, and the
 * scale maths would silently be wrong.
 *
 * Usage:
 *   pnpm run build:pokemon              # every default-form species
 *   pnpm run build:pokemon -- --limit=151
 *   pnpm run build:pokemon -- --force   # ignore the on-disk HTTP cache
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, ".pokemon-cache");
const OUT_IMAGE_DIR = path.join(ROOT, "public", "pokemon", "normalized");
const OUT_DATA_FILE = path.join(ROOT, "src", "data", "pokemon.generated.json");

/** Alpha below this counts as "transparent padding" rather than Pokémon. */
const ALPHA_THRESHOLD = 12;
/** Longest edge of a normalized sprite. Keeps assets small without visible loss. */
const MAX_EDGE = 448;
const CONCURRENCY = 12;
const REQUEST_RETRIES = 4;

const GENERATION_BY_NAME: Record<string, number> = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};

interface NamedApiResource {
  name: string;
  url: string;
}

interface SpeciesResponse {
  id: number;
  name: string;
  names: Array<{ name: string; language: NamedApiResource }>;
  generation: NamedApiResource;
  varieties: Array<{ is_default: boolean; pokemon: NamedApiResource }>;
  is_mythical: boolean;
  is_legendary: boolean;
}

interface PokemonResponse {
  id: number;
  name: string;
  height: number;
  sprites: {
    front_default: string | null;
    other?: {
      "official-artwork"?: { front_default: string | null };
      home?: { front_default: string | null };
    };
  };
}

interface PokemonRecord {
  id: number;
  name: string;
  displayName: string;
  heightDecimeters: number;
  heightMeters: number;
  image: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number;
  generation: number;
}

function parseArgs(argv: string[]) {
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  return {
    limit: limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : Number.POSITIVE_INFINITY,
    force: argv.includes("--force"),
  };
}

const args = parseArgs(process.argv.slice(2));

function cacheKey(url: string) {
  return createHash("sha1").update(url).digest("hex");
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      // 404 is a real answer, not a transient failure.
      if (response.status === 404) throw new Error(`404 ${url}`);
      lastError = new Error(`${response.status} ${url}`);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith("404")) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
  }
  throw lastError instanceof Error ? lastError : new Error(`Failed to fetch ${url}`);
}

async function getJson<T>(url: string): Promise<T> {
  const file = path.join(CACHE_DIR, "json", `${cacheKey(url)}.json`);
  if (!args.force) {
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch {
      /* cache miss */
    }
  }
  const response = await fetchWithRetry(url);
  const text = await response.text();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
  return JSON.parse(text) as T;
}

async function getBinary(url: string): Promise<Buffer> {
  const file = path.join(CACHE_DIR, "img", `${cacheKey(url)}.bin`);
  if (!args.force) {
    try {
      return await readFile(file);
    } catch {
      /* cache miss */
    }
  }
  const response = await fetchWithRetry(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  return buffer;
}

/**
 * Bounding box of every pixel whose alpha clears ALPHA_THRESHOLD.
 * Returns null when the image is effectively empty.
 */
function alphaBoundingBox(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { left: number; top: number; width: number; height: number } | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x += 1) {
      const alpha = data[rowStart + x * channels + (channels - 1)] ?? 0;
      if (alpha <= ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0 || maxY < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function pickSpriteUrl(pokemon: PokemonResponse): string | null {
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_default ??
    pokemon.sprites.other?.home?.front_default ??
    pokemon.sprites.front_default ??
    null
  );
}

function englishName(species: SpeciesResponse): string {
  const english = species.names.find((entry) => entry.language.name === "en");
  if (english?.name) return english.name;
  return species.name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

interface BuildFailure {
  id: number;
  name: string;
  reason: string;
}

const failures: BuildFailure[] = [];
const fallbackArtwork: string[] = [];

async function buildOne(entry: NamedApiResource): Promise<PokemonRecord | null> {
  const species = await getJson<SpeciesResponse>(entry.url);
  const defaultVariety = species.varieties.find((variety) => variety.is_default);
  if (!defaultVariety) {
    failures.push({ id: species.id, name: species.name, reason: "no default variety" });
    return null;
  }

  const pokemon = await getJson<PokemonResponse>(defaultVariety.pokemon.url);

  const heightDecimeters = pokemon.height;
  if (!Number.isFinite(heightDecimeters) || heightDecimeters <= 0) {
    failures.push({ id: species.id, name: species.name, reason: `invalid height ${heightDecimeters}` });
    return null;
  }

  const spriteUrl = pickSpriteUrl(pokemon);
  if (!spriteUrl) {
    failures.push({ id: species.id, name: species.name, reason: "no sprite" });
    return null;
  }
  if (!spriteUrl.includes("official-artwork")) {
    fallbackArtwork.push(species.name);
  }

  const source = await getBinary(spriteUrl);
  const image = sharp(source).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const box = alphaBoundingBox(data, info.width, info.height, info.channels);
  if (!box) {
    failures.push({ id: species.id, name: species.name, reason: "fully transparent sprite" });
    return null;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(box.width, box.height));
  const outWidth = Math.max(1, Math.round(box.width * scale));
  const outHeight = Math.max(1, Math.round(box.height * scale));

  const outFile = path.join(OUT_IMAGE_DIR, `${species.id}.png`);
  const output = await sharp(source)
    .ensureAlpha()
    .extract(box)
    .resize(outWidth, outHeight, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 9, effort: 10 })
    .toBuffer({ resolveWithObject: true });

  await writeFile(outFile, output.data);

  return {
    id: species.id,
    name: species.name,
    displayName: englishName(species),
    heightDecimeters,
    heightMeters: Number((heightDecimeters / 10).toFixed(4)),
    image: `/pokemon/normalized/${species.id}.png`,
    imageWidth: output.info.width,
    imageHeight: output.info.height,
    aspectRatio: Number((output.info.width / output.info.height).toFixed(4)),
    generation: GENERATION_BY_NAME[species.generation.name] ?? 0,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  let completed = 0;

  async function run() {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index] as T, index);
      completed += 1;
      if (completed % 25 === 0 || completed === items.length) {
        process.stdout.write(`\r  processed ${completed}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  process.stdout.write("\n");
  return results;
}

async function main() {
  console.log("PokéScale asset build");
  await mkdir(OUT_IMAGE_DIR, { recursive: true });
  await mkdir(path.dirname(OUT_DATA_FILE), { recursive: true });

  console.log("• fetching species index…");
  const index = await getJson<{ count: number; results: NamedApiResource[] }>(
    "https://pokeapi.co/api/v2/pokemon-species?limit=100000",
  );

  const species = index.results.slice(0, Math.min(index.results.length, args.limit));
  console.log(`• ${species.length} species to normalize (concurrency ${CONCURRENCY})`);

  const settled = await mapWithConcurrency(species, CONCURRENCY, async (entry) => {
    try {
      return await buildOne(entry);
    } catch (error) {
      failures.push({
        id: -1,
        name: entry.name,
        reason: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  });

  const records = settled
    .filter((record): record is PokemonRecord => record !== null)
    .sort((a, b) => a.id - b.id);

  // Remove stale sprites from earlier runs so the folder always matches the data.
  const keep = new Set(records.map((record) => `${record.id}.png`));
  for (const file of await readdir(OUT_IMAGE_DIR)) {
    if (file.endsWith(".png") && !keep.has(file)) {
      await rm(path.join(OUT_IMAGE_DIR, file));
    }
  }

  await writeFile(OUT_DATA_FILE, `${JSON.stringify(records, null, 2)}\n`);

  console.log(`\n✓ wrote ${records.length} Pokémon → ${path.relative(ROOT, OUT_DATA_FILE)}`);
  if (fallbackArtwork.length) {
    console.log(`• ${fallbackArtwork.length} used non-official artwork: ${fallbackArtwork.join(", ")}`);
  }
  if (failures.length) {
    console.log(`• ${failures.length} skipped:`);
    for (const failure of failures) console.log(`    ${failure.name}: ${failure.reason}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
