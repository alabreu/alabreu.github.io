import { ScryfallCard } from '../../types';

export type EdhrecCardRef = {
  name: string;
  synergy?: number;
  num_decks?: number;
  potential_decks?: number;
};

export type EdhrecList = { header: string; cards: EdhrecCardRef[] };

/** EDHREC URL slug for a commander name (front face only for MDFCs). */
export function edhrecSlug(name: string): string {
  return name
    .split(' // ')[0]
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['".,!?:()]/g, '')
    .replace(/[^a-z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const HEADER_PT: Record<string, string> = {
  'High Synergy Cards': 'Alta sinergia',
  'Top Cards': 'Mais usadas',
  'Game Changers': 'Game Changers',
  'New Cards': 'Novidades',
  Creatures: 'Criaturas',
  Instants: 'Instantâneas',
  Sorceries: 'Feitiços',
  'Utility Artifacts': 'Artefatos utilitários',
  'Mana Artifacts': 'Artefatos de mana',
  Artifacts: 'Artefatos',
  Enchantments: 'Encantamentos',
  Planeswalkers: 'Planeswalkers',
  Battles: 'Batalhas',
  'Utility Lands': 'Terrenos utilitários',
  Lands: 'Terrenos',
};

export function translateHeader(header: string): string {
  return HEADER_PT[header] ?? header;
}

/** Fetches the EDHREC recommendation lists for a commander (or partner pair). */
export async function fetchEdhrecLists(
  commanderName: string,
  partnerName?: string | null
): Promise<EdhrecList[]> {
  const slugs = partnerName
    ? [
        `${edhrecSlug(commanderName)}-${edhrecSlug(partnerName)}`,
        `${edhrecSlug(partnerName)}-${edhrecSlug(commanderName)}`,
      ]
    : [edhrecSlug(commanderName)];

  let lastError: Error | null = null;
  for (const slug of slugs) {
    try {
      const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`);
      if (!res.ok) {
        lastError = new Error(`EDHREC respondeu ${res.status}`);
        continue;
      }
      const data = await res.json();
      const cardlists = data?.container?.json_dict?.cardlists;
      if (!Array.isArray(cardlists)) {
        lastError = new Error('Resposta do EDHREC em formato inesperado');
        continue;
      }
      return cardlists
        .map((l: any): EdhrecList => ({
          header: String(l?.header ?? ''),
          cards: (Array.isArray(l?.cardviews) ? l.cardviews : []).map((c: any): EdhrecCardRef => ({
            name: String(c?.name ?? ''),
            synergy: typeof c?.synergy === 'number' ? c.synergy : undefined,
            num_decks: typeof c?.num_decks === 'number' ? c.num_decks : undefined,
            potential_decks: typeof c?.potential_decks === 'number' ? c.potential_decks : undefined,
          })),
        }))
        .filter((l) => l.header && l.cards.length > 0);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Falha ao consultar o EDHREC');
    }
  }
  throw lastError ?? new Error('EDHREC indisponível');
}

/** Resolves card names to full Scryfall cards (batches of 75). */
export async function hydrateCards(names: string[]): Promise<ScryfallCard[]> {
  const out: ScryfallCard[] = [];
  for (let i = 0; i < names.length; i += 75) {
    const chunk = names.slice(i, i + 75);
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) }),
    });
    if (!res.ok) throw new Error(`Scryfall respondeu ${res.status}`);
    const data = await res.json();
    out.push(...((data?.data ?? []) as ScryfallCard[]));
  }
  return out;
}
