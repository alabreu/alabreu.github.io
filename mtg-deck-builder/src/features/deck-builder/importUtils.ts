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
  const seen = new Set<string>();
  let currentSection: string | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('//') || line.startsWith('#')) {
      const heading = line.replace(/^\/\/|^#/, '').trim();
      if (heading && !isDecorativeComment(heading)) currentSection = normalizeSectionName(heading);
      continue;
    }

    const match = line.match(/^(\d+)[xX]?\s+(.+)$/);
    if (!match) continue;
    const quantity = Math.min(99, Math.max(1, parseInt(match[1], 10)));

    // Moxfield-style inline tag at the end of the line, e.g. "Sol Ring [Ramp]"
    // or "Ardenn, Intrepid Archaeologist [Commander{top}]" (pin marker discarded).
    let rest = match[2];
    let inlineSection: string | null = null;
    const bracketMatch = rest.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);
    if (bracketMatch) {
      rest = bracketMatch[1];
      const tag = bracketMatch[2].replace(/\{[^}]*\}/g, '').trim();
      if (tag) inlineSection = normalizeSectionName(tag);
    }

    const name = rest
      .replace(/\s+\([A-Z0-9]{2,6}\)\s+\d+.*/, '')
      .replace(/\s+\*.*$/, '')
      .trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ quantity, name, section: inlineSection ?? currentSection });
  }
  return result;
}

export function scryfallToDeckCard(scryfall: ScryfallCard, quantity: number, category?: string): DeckCard {
  return toDeckCard(scryfall, category ?? defaultCategoryFor(scryfall), quantity);
}

export async function fetchCardsByName(
  parsed: ParsedLine[]
): Promise<{ toImport: DeckCard[]; notFound: string[]; sections: string[] }> {
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
  const sections: string[] = [];
  for (const { name, quantity, section } of parsed) {
    const scryfall = byName.get(name.toLowerCase());
    if (!scryfall) continue;
    toImport.push(scryfallToDeckCard(scryfall, quantity, section ?? undefined));
    if (section && !sections.includes(section)) sections.push(section);
  }

  return { toImport, notFound: notFoundNames, sections };
}
