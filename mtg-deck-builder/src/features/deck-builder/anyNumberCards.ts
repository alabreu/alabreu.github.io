// Cards whose own text overrides the Commander singleton rule, e.g.
//   "A deck can have any number of cards named Relentless Rats."
//   "A deck can have up to seven cards named Seven Dwarves."
//
// Keyed by lowercased card name, valued by the copy limit (`null` = unlimited).
// Name-keyed on purpose: it works for decks that were already saved, whereas
// anything derived from oracle text would only cover cards added after the
// change (we don't persist oracle_text on DeckCard).
//
// GENERATED — do not edit by hand. Run `node scripts/build-any-number-cards.mjs`,
// which the monthly refresh workflow also runs. It is committed rather than
// fetched at runtime so deck validation stays synchronous: a list that arrived
// late would flash a false "excede o limite" error and then clear it.
export const ANY_NUMBER_CARDS: Record<string, number | null> = {
  "cid, timeless artificer": null,
  "dragon's approach": null,
  "hare apparent": null,
  "nazgûl": 9,
  "persistent petitioners": null,
  "rat colony": null,
  "relentless rats": null,
  "seven dwarves": 7,
  "shadowborn apostle": null,
  "slime against humanity": null,
  "sphinx's approach": null,
  "tempest hawk": null,
  "templar knight": null,
};

/** Front face only, lowercased — matches how the snapshot is keyed. */
function normalize(name: string): string {
  return name.split('//')[0].trim().toLowerCase();
}

/**
 * How many copies of this card a Commander deck may legally hold.
 * `Infinity` for basic lands and for cards that lift the limit themselves.
 */
export function maxCopiesAllowed(name: string, typeLine: string | null): number {
  const t = typeLine ?? '';
  if (t.includes('Basic') && t.includes('Land')) return Infinity;

  const key = normalize(name);
  if (key in ANY_NUMBER_CARDS) {
    const limit = ANY_NUMBER_CARDS[key];
    return limit === null ? Infinity : limit;
  }
  return 1;
}
