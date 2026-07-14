import { DeckCard, ScryfallCard } from '../../types';
import { scryfallToDeckCard as toDeckCard, defaultCategoryFor } from '../card/cardUtils';

export interface ParsedLine {
  quantity: number;
  name: string;
  /** Section this card was listed under (from a "// Section" or "# Section"
   *  comment above it), or null when the list has no such headers. */
  section: string | null;
}

/** True for decorative comment lines ("// ---", "# ===") that don't name a section. */
function isDecorativeComment(text: string): boolean {
  return text.replace(/[-=_*\s]/g, '').length === 0;
}

/** Normalizes common English section names (Moxfield/Archidekt exports) to our pt-BR defaults. */
const CATEGORY_ALIASES: Record<string, string> = {
  commander: 'Comandante',
  commanders: 'Comandante',
  land: 'Terrenos',
  lands: 'Terrenos',
  ramp: 'Ramp',
  'mana ramp': 'Ramp',
  draw: 'Compra de Cartas',
  'card draw': 'Compra de Cartas',
  carddraw: 'Compra de Cartas',
  removal: 'Remoção',
  'spot removal': 'Remoção',
  protection: 'Proteção',
  wincon: 'Wincons',
  wincons: 'Wincons',
  finisher: 'Wincons',
  finishers: 'Wincons',
  'win condition': 'Wincons',
  'win conditions': 'Wincons',
};

function normalizeSectionName(name: string): string {
  return CATEGORY_ALIASES[name.toLowerCase()] ?? name;
}

export function parseDecklist(text: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  const seen = new Map<string, ParsedLine>();
  let currentSection: string | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('//') || line.startsWith('#')) {
      const heading = line.replace(/^\/\/|^#/, '').trim();
      if (heading && !isDecorativeComment(heading)) currentSection = normalizeSectionName(heading);
      continue;
    }

    // A leading "N " or "Nx " sets the quantity; lines without one (e.g. a
    // bare card name pasted from a "not found" list) default to 1 instead of
    // being silently dropped. Only treat a leading number as a quantity when
    // it's a plausible count (<= 99) or has an explicit "x" — otherwise a card
    // whose name starts with a big number (e.g. "1996 World Champion") would be
    // mis-parsed with the number stripped off.
    const match = line.match(/^(\d+)(x?)\s+(.+)$/i);
    const leadingNum = match ? parseInt(match[1], 10) : 0;
    const isQuantity = !!match && (!!match[2] || leadingNum <= 99);
    const quantity = isQuantity ? Math.min(99, Math.max(1, leadingNum)) : 1;

    // Moxfield-style inline tag at the end of the line, e.g. "Sol Ring [Ramp]"
    // or "Ardenn, Intrepid Archaeologist [Commander{top}]" (pin marker discarded).
    let rest = isQuantity ? match![3] : line;
    let inlineSection: string | null = null;
    const bracketMatch = rest.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (bracketMatch) {
      rest = bracketMatch[1];
      const tag = bracketMatch[2].replace(/\{[^}]*\}/g, '').trim();
      if (tag) inlineSection = normalizeSectionName(tag);
    }

    const name = rest
      // Trailing "(SET) 123" collector reference — case-insensitive so lowercase
      // set codes some exporters emit ("(m21) 263") don't leak into the name.
      .replace(/\s+\([A-Za-z0-9]{2,6}\)\s+\d+.*/, '')
      .replace(/\s+\*.*$/, '')
      .trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      // Same card listed twice — sum the quantities instead of dropping the
      // repeat (keeps the first occurrence's section).
      existing.quantity = Math.min(99, existing.quantity + quantity);
      continue;
    }
    const entry: ParsedLine = { quantity, name, section: inlineSection ?? currentSection };
    seen.set(key, entry);
    result.push(entry);
  }
  return result;
}

export function scryfallToDeckCard(scryfall: ScryfallCard, quantity: number, category?: string): DeckCard {
  return toDeckCard(scryfall, category ?? defaultCategoryFor(scryfall), quantity);
}

async function fetchCardByExactName(name: string): Promise<ScryfallCard | null> {
  const res = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifiers: [{ name }] }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.data as ScryfallCard[])[0] ?? null;
}

/** Lowercase + strip diacritics + unify curly apostrophes, so a typed
 *  "Lim-Dul's Vault" matches Scryfall's canonical "Lim-Dûl's Vault". */
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritical marks
    .replace(/[‘’]/g, "'") // curly apostrophes → straight
    .toLowerCase()
    .trim();
}

export async function fetchCardsByName(
  parsed: ParsedLine[]
): Promise<{ toImport: DeckCard[]; notFound: string[]; sections: string[] }> {
  const identifiers = parsed.map((p) => ({ name: p.name }));
  const foundCards: ScryfallCard[] = [];
  const notFoundNames: string[] = [];
  let chunkErrors = 0;

  for (let i = 0; i < identifiers.length; i += 75) {
    const batch = identifiers.slice(i, i + 75);
    // Space batches out (~100ms) so a big multi-chunk import doesn't burst
    // past Scryfall's rate limit.
    if (i > 0) await new Promise((res) => setTimeout(res, 100));
    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: batch }),
      });
      if (!res.ok) throw new Error('Scryfall error');
      const data = await res.json();
      foundCards.push(...(data.data as ScryfallCard[]));
      for (const missing of data.not_found ?? []) {
        if (missing.name) notFoundNames.push(missing.name as string);
      }
    } catch {
      // A single failed chunk must not discard the cards already fetched from
      // earlier chunks — surface this chunk's names as "not found" and press on.
      chunkErrors++;
      for (const id of batch) notFoundNames.push(id.name);
    }
  }

  // Every chunk failed — this is a total failure (offline / Scryfall down), so
  // let the caller show an error instead of "0 imported, N not found".
  if (foundCards.length === 0 && chunkErrors > 0) throw new Error('Scryfall error');

  // Build lookup by full name AND by front-face name (for DFC fuzzy matches).
  // Scryfall fuzzy-matches "Delver of Secrets" → returns the card whose canonical
  // name is "Delver of Secrets // Insectile Aberration". Without the front-face
  // alias, our map lookup by the original searched name would miss it. Also
  // index a diacritic/punctuation-normalized key so accent/apostrophe
  // differences between the typed name and Scryfall's canonical name still match.
  const byName = new Map<string, ScryfallCard>();
  const byNorm = new Map<string, ScryfallCard>();
  const addKeys = (key: string, card: ScryfallCard) => {
    if (!byName.has(key)) byName.set(key, card);
    const norm = normalizeName(key);
    if (!byNorm.has(norm)) byNorm.set(norm, card);
  };
  for (const card of foundCards) {
    addKeys(card.name.toLowerCase(), card);
    const frontFace = card.card_faces?.[0];
    if (frontFace) addKeys(frontFace.name.toLowerCase(), card);
  }

  // Some exporters join two independent cards on one line with " // " instead
  // of naming a real multi-faced card — most commonly a Commander paired with
  // its chosen Background. Resolve each half independently for anything still
  // missing; only split into two cards when the combined name isn't itself a
  // single card on Scryfall (a genuine split/MDFC card resolves via its front
  // face alone and is kept as one entry).
  const pairResults = new Map<string, ScryfallCard[]>();
  const stillMissing: string[] = [];
  for (const name of notFoundNames) {
    if (!name.includes(' // ')) {
      stillMissing.push(name);
      continue;
    }
    const [frontRaw, backRaw] = name.split(' // ').map((s) => s.trim());
    const frontCard = frontRaw ? await fetchCardByExactName(frontRaw) : null;
    if (frontCard && frontCard.name.toLowerCase() === name.toLowerCase()) {
      pairResults.set(name.toLowerCase(), [frontCard]);
      continue;
    }
    const backCard = backRaw ? await fetchCardByExactName(backRaw) : null;
    const cards = [frontCard, backCard].filter((c): c is ScryfallCard => !!c);
    if (cards.length > 0) {
      pairResults.set(name.toLowerCase(), cards);
    } else {
      stillMissing.push(name);
    }
  }

  const toImport: DeckCard[] = [];
  const sections: string[] = [];
  for (const { name, quantity, section } of parsed) {
    const key = name.toLowerCase();
    const scryfall = byName.get(key) ?? byNorm.get(normalizeName(name));
    if (scryfall) {
      toImport.push(scryfallToDeckCard(scryfall, quantity, section ?? undefined));
      if (section && !sections.includes(section)) sections.push(section);
      continue;
    }
    const pair = pairResults.get(key);
    if (pair) {
      for (const card of pair) {
        toImport.push(scryfallToDeckCard(card, quantity, section ?? undefined));
      }
      if (section && !sections.includes(section)) sections.push(section);
    }
  }

  return { toImport, notFound: stillMissing, sections };
}
