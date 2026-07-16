// Community function-tag grouping data. The map (oracle_id → our category) is a
// precomputed snapshot built from Scryfall's oracle tags (see
// scripts/build-function-tags.mjs), shipped as a static file and fetched
// lazily — only when the user turns on "function" grouping, so it costs nothing
// for everyone else. A card not in the snapshot falls back to "Outros".

interface FunctionTagsFile {
  generatedAt?: string | null;
  tags?: Record<string, string>;
}

let cache: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

export function loadFunctionTags(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (loading) return loading;
  loading = fetch(`${import.meta.env.BASE_URL}functionTags.json`)
    .then((r) => (r.ok ? (r.json() as Promise<FunctionTagsFile>) : { tags: {} }))
    .then((data) => {
      cache = data?.tags ?? {};
      return cache;
    })
    .catch(() => {
      cache = {}; // network/parse failure → behave as "no tags" (all fall back)
      return cache;
    });
  return loading;
}

/** Kick off the lazy load (idempotent) so the snapshot is ready before cards
 *  are added in function mode. */
export function ensureFunctionTagsLoaded(): void {
  void loadFunctionTags();
}

/** Synchronous lookup against the loaded snapshot. Returns undefined if the
 *  snapshot isn't loaded yet or the card isn't tagged — callers fall back. */
export function getFunctionCategorySync(oracleId: string | null | undefined): string | undefined {
  if (!oracleId || !cache) return undefined;
  return cache[oracleId];
}
