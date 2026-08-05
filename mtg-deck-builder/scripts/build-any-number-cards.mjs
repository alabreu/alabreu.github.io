// Regenerates src/features/deck-builder/anyNumberCards.ts — the list of cards
// whose own text overrides the Commander singleton rule.
//
//   node scripts/build-any-number-cards.mjs
//
// Needs network access to Scryfall (free, no API key). Node 18+.
//
// Emits a TypeScript module rather than JSON on purpose: deck validation is a
// synchronous pure function, so the data has to be in the bundle. A runtime
// fetch would briefly flag legal decks as illegal while it loaded.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'src', 'features', 'deck-builder', 'anyNumberCards.ts');

// Both templates live under the same opening clause:
//   "A deck can have any number of cards named X."
//   "A deck can have up to seven cards named Seven Dwarves."
const QUERY = 'o:"a deck can have" game:paper';
const UA = 'TutorBrew/1.0 (any-number-cards snapshot builder)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/** null = unlimited, a number = that cap, undefined = text didn't match. */
function parseLimit(oracle) {
  if (!oracle) return undefined;
  if (/a deck can have any number of cards named/i.test(oracle)) return null;
  const capped = oracle.match(/a deck can have up to (\w+) cards named/i);
  if (capped) {
    const n = NUMBER_WORDS[capped[1].toLowerCase()] ?? Number(capped[1]);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

async function fetchCards() {
  const found = new Map(); // lowercased name -> limit
  let url = 'https://api.scryfall.com/cards/search?unique=cards&q=' + encodeURIComponent(QUERY);
  let pages = 0;
  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 404) return found; // no results is a valid answer
    if (!res.ok) throw new Error(`Scryfall ${res.status}`);
    const data = await res.json();
    for (const card of data.data ?? []) {
      // Multi-faced cards keep the clause on a face, not the top level.
      const texts = [card.oracle_text, ...(card.card_faces ?? []).map((f) => f.oracle_text)];
      for (const t of texts) {
        const limit = parseLimit(t);
        if (limit !== undefined) {
          found.set(card.name.split('//')[0].trim().toLowerCase(), limit);
          break;
        }
      }
    }
    pages++;
    url = data.has_more ? data.next_page : null;
    if (url) await sleep(120); // stay well under Scryfall's rate limit
  }
  console.log(`  ${QUERY} → ${found.size} cards (${pages} page(s))`);
  return found;
}

function render(entries) {
  const body = entries
    .map(([name, limit]) => `  ${JSON.stringify(name)}: ${limit === null ? 'null' : limit},`)
    .join('\n');
  return `// Cards whose own text overrides the Commander singleton rule, e.g.
//   "A deck can have any number of cards named Relentless Rats."
//   "A deck can have up to seven cards named Seven Dwarves."
//
// Keyed by lowercased card name, valued by the copy limit (\`null\` = unlimited).
// Name-keyed on purpose: it works for decks that were already saved, whereas
// anything derived from oracle text would only cover cards added after the
// change (we don't persist oracle_text on DeckCard).
//
// GENERATED — do not edit by hand. Run \`node scripts/build-any-number-cards.mjs\`,
// which the monthly refresh workflow also runs. It is committed rather than
// fetched at runtime so deck validation stays synchronous: a list that arrived
// late would flash a false "excede o limite" error and then clear it.
export const ANY_NUMBER_CARDS: Record<string, number | null> = {
${body}
};

/** Front face only, lowercased — matches how the snapshot is keyed. */
function normalize(name: string): string {
  return name.split('//')[0].trim().toLowerCase();
}

/**
 * How many copies of this card a Commander deck may legally hold.
 * \`Infinity\` for basic lands and for cards that lift the limit themselves.
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
`;
}

async function main() {
  console.log('Buscando cartas com regra própria de cópias...');
  const found = await fetchCards();

  if (found.size === 0) {
    // Never blank the list on an empty/failed answer — a silent wipe would
    // start flagging perfectly legal Rat decks as illegal.
    console.error('! Nenhuma carta encontrada — mantendo o arquivo atual.');
    process.exitCode = 1;
    return;
  }

  // Keep whatever the current file already knows: if Scryfall changes its
  // wording, we lose coverage rather than silently dropping cards.
  const current = await readFile(OUT, 'utf8').catch(() => '');
  const known = new Map();
  for (const m of current.matchAll(/^\s+"([^"]+)":\s*(null|\d+),$/gm)) {
    known.set(m[1], m[2] === 'null' ? null : Number(m[2]));
  }
  const dropped = [...known.keys()].filter((k) => !found.has(k));
  if (dropped.length) {
    console.warn(`! ${dropped.length} carta(s) não vieram do Scryfall e foram mantidas: ${dropped.join(', ')}`);
    for (const [k, v] of known) if (!found.has(k)) found.set(k, v);
  }

  const entries = [...found.entries()].sort(([a], [b]) => a.localeCompare(b));
  await writeFile(OUT, render(entries));
  const unlimited = entries.filter(([, v]) => v === null).length;
  console.log(`\nEscrito ${OUT}`);
  console.log(`  ${entries.length} cartas — ${unlimited} sem limite, ${entries.length - unlimited} com teto próprio`);
  for (const [name, limit] of entries) console.log(`    ${name}: ${limit === null ? 'ilimitado' : limit}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
