import { DeckCard, ScryfallCard } from '../../types';
import { scryfallToDeckCard as toDeckCard, defaultCategoryFor } from '../card/cardUtils';

export interface ParsedLine {
  quantity: number;
  name: string;
}

export function parseDecklist(text: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    const match = line.match(/^(\d+)[xX]?\s+(.+)$/);
    if (!match) continue;
    const quantity = Math.min(99, Math.max(1, parseInt(match[1], 10)));
    const name = match[2]
      .replace(/\s+\([A-Z0-9]{2,6}\)\s+\d+.*/, '')
      .replace(/\s+\*.*$/, '')
      .trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ quantity, name });
  }
  return result;
}

export function scryfallToDeckCard(scryfall: ScryfallCard, quantity: number): DeckCard {
  return toDeckCard(scryfall, defaultCategoryFor(scryfall), quantity);
}

export async function fetchCardsByName(
  parsed: ParsedLine[]
): Promise<{ toImport: DeckCard[]; notFound: string[] }> {
  const identifiers = parsed.map((p) => ({ name: p.name }));
  const foundCards: ScryfallCard[] = [];
  const notFoundNames: string[] = [];

  for (let i = 0; i < identifiers.length; i += 75) {
    const batch = identifiers.slice(i, i + 75);
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
  }

  // Build lookup by full name AND by front-face name (for DFC fuzzy matches).
  // Scryfall fuzzy-matches "Delver of Secrets" → returns the card whose canonical
  // name is "Delver of Secrets // Insectile Aberration". Without the front-face
  // alias, our map lookup by the original searched name would miss it.
  const byName = new Map<string, ScryfallCard>();
  for (const card of foundCards) {
    byName.set(card.name.toLowerCase(), card);
    const frontFace = card.card_faces?.[0];
    if (frontFace) {
      const frontKey = frontFace.name.toLowerCase();
      if (!byName.has(frontKey)) byName.set(frontKey, card);
    }
  }

  const toImport: DeckCard[] = [];
  for (const { name, quantity } of parsed) {
    const scryfall = byName.get(name.toLowerCase());
    if (scryfall) toImport.push(scryfallToDeckCard(scryfall, quantity));
  }

  return { toImport, notFound: notFoundNames };
}
