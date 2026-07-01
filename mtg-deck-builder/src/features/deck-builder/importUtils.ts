import { DeckCard, ManaColor, ScryfallCard } from '../../types';

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
  const face = scryfall.card_faces?.[0];
  const validColors = ['W', 'U', 'B', 'R', 'G', 'C'];
  const typeLine = scryfall.type_line ?? face?.type_line ?? '';
  return {
    scryfallId: scryfall.id,
    name: scryfall.name,
    quantity,
    category: typeLine.includes('Land') ? 'Terrenos' : 'Outros',
    imageUrl: (scryfall.image_uris ?? face?.image_uris)?.normal ?? null,
    artCropUrl: (scryfall.image_uris ?? face?.image_uris)?.art_crop ?? null,
    manaCost: scryfall.mana_cost ?? face?.mana_cost ?? null,
    typeLine,
    cmc: scryfall.cmc,
    colorIdentity: scryfall.color_identity.filter(
      (c): c is ManaColor => validColors.includes(c)
    ),
  };
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

  const byName = new Map(foundCards.map((c) => [c.name.toLowerCase(), c]));
  const toImport: DeckCard[] = [];
  for (const { name, quantity } of parsed) {
    const scryfall = byName.get(name.toLowerCase());
    if (scryfall) toImport.push(scryfallToDeckCard(scryfall, quantity));
  }

  return { toImport, notFound: notFoundNames };
}
