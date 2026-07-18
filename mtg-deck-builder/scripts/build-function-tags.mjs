// Generates public/functionTags.json — a snapshot mapping Scryfall oracle_id →
// our function category, built from the Scryfall Tagger's community oracle tags.
//
// Run manually when a new set drops, or on a schedule (see
// .github/workflows/refresh-function-tags.yml). Needs network access to
// Scryfall (free, no API key). Node 18+.
//
//   node scripts/build-function-tags.mjs
//
// Precedence: CATEGORIES is ordered — the FIRST category whose query matches a
// card wins, so a card tagged both ramp and card-advantage lands in whichever
// comes first below. Tune the queries/order and re-run; the app falls back to
// "Outros" for any card not in the snapshot, so a missing/rough tag is safe.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'functionTags.json');

// Category (our section name) → Scryfall search using oracle tags (otag:).
// Order = precedence (first match wins). Use ONE confirmed tag per category —
// avoid compound queries with an unconfirmed slug, since an unknown otag could
// fail the whole query and drop a good category. A category whose tag is
// invalid/empty just logs 0 and is skipped (safe). Confirmed as real tags:
// ramp, removal, card-advantage, alternate-win-condition (via Scryfall Tagger).
const CATEGORIES = [
  { category: 'Ramp', query: 'otag:ramp' },
  { category: 'Remoção', query: 'otag:removal' },
  { category: 'Compra de Cartas', query: 'otag:card-advantage' },
  // 'protection' is not verified as a single tag — if it returns 0/errors,
  // it's skipped. Report the count and I'll swap it for a confirmed slug.
  { category: 'Proteção', query: 'otag:protection' },
  { category: 'Wincons', query: 'otag:alternate-win-condition' },
];

const UA = 'TutorBrew/1.0 (function-tags snapshot builder)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAllOracleIds(query) {
  const ids = new Set();
  // unique=cards collapses printings; game:paper drops Arena/Alchemy-only cards.
  let url =
    'https://api.scryfall.com/cards/search?unique=cards&q=' +
    encodeURIComponent(`${query} game:paper`);
  let pages = 0;
  while (url) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (res.status === 404) return ids; // 0 results — valid, just empty
    if (!res.ok) throw new Error(`Scryfall ${res.status} for ${query}`);
    const data = await res.json();
    for (const card of data.data ?? []) {
      if (card.oracle_id) ids.add(card.oracle_id);
    }
    pages++;
    url = data.has_more ? data.next_page : null;
    if (url) await sleep(120); // stay well under Scryfall's rate limit
  }
  console.log(`  ${query} → ${ids.size} cards (${pages} page(s))`);
  return ids;
}

async function main() {
  const tags = {};
  let matched = 0;
  for (const { category, query } of CATEGORIES) {
    try {
      const ids = await fetchAllOracleIds(query);
      for (const id of ids) {
        if (!(id in tags)) {
          tags[id] = category; // precedence: earlier category wins
          matched++;
        }
      }
    } catch (err) {
      console.warn(`  ! skipped "${category}" (${query}): ${err.message}`);
    }
    await sleep(120);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    count: matched,
    tags,
  };
  await writeFile(OUT, JSON.stringify(out) + '\n');
  console.log(`\nWrote ${matched} tagged cards to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
