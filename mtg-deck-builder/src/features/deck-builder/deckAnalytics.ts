import { Deck, DeckCard, ManaColor } from '../../types';
import { countedCards } from '../../lib/deckCounting';

// Numbers behind the "Estatísticas do deck" sheet. Everything is computed over
// the cards that count toward the deck (sections switched off are left out)
// and weighted by quantity.

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Mana color, when the slice stands for one — the legend shows its symbol. */
  mana?: ManaColor;
}

const isLand = (c: DeckCard) => Boolean(c.typeLine?.includes('Land'));

const COLOR_ORDER: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];
const COLOR_NAMES: Record<ManaColor, string> = {
  W: 'Branco', U: 'Azul', B: 'Preto', R: 'Vermelho', G: 'Verde', C: 'Incolor',
};
const MANA_VAR: Record<ManaColor, string> = {
  W: 'var(--mana-w)', U: 'var(--mana-u)', B: 'var(--mana-b)',
  R: 'var(--mana-r)', G: 'var(--mana-g)', C: 'var(--mana-c)',
};
const MULTI_COLOR = '#eab308';

/** Mana curve: non-land cards by mana value, 7+ folded into the last bar. */
export function manaCurve(deck: Deck): { label: string; value: number }[] {
  const buckets = new Array(8).fill(0);
  for (const c of countedCards(deck)) {
    if (isLand(c)) continue;
    buckets[Math.min(7, Math.max(0, Math.floor(c.cmc)))] += c.quantity;
  }
  return buckets.map((value, i) => ({ label: i === 7 ? '7+' : String(i), value }));
}

/** Colors present in a card's mana cost (hybrid/phyrexian symbols included). */
function costColors(card: DeckCard): ManaColor[] {
  const cost = card.manaCost ?? '';
  return COLOR_ORDER.filter((color) => cost.includes(color));
}

/** Card colors: mono-colored cards in their color, the rest in Multicolor or
 *  Incolor. Lands are left out (they have no mana cost). */
export function cardColors(deck: Deck): Slice[] {
  const counts: Record<string, number> = {};
  for (const c of countedCards(deck)) {
    if (isLand(c)) continue;
    const colors = costColors(c);
    const key = colors.length === 0 ? 'C' : colors.length === 1 ? colors[0] : 'M';
    counts[key] = (counts[key] ?? 0) + c.quantity;
  }
  const slices: Slice[] = COLOR_ORDER.map((m) => ({
    key: m, label: COLOR_NAMES[m], value: counts[m] ?? 0, color: MANA_VAR[m], mana: m,
  }));
  slices.push({ key: 'M', label: 'Multicolor', value: counts.M ?? 0, color: MULTI_COLOR });
  slices.push({ key: 'C', label: 'Incolor', value: counts.C ?? 0, color: MANA_VAR.C, mana: 'C' });
  return slices.filter((s) => s.value > 0);
}

const BASIC_PRODUCES: [string, ManaColor][] = [
  ['Plains', 'W'], ['Island', 'U'], ['Swamp', 'B'], ['Mountain', 'R'], ['Forest', 'G'], ['Wastes', 'C'],
];

/** Fallback when Scryfall's produced_mana isn't loaded: basic land types. */
function producedFromTypeLine(card: DeckCard): ManaColor[] {
  const type = card.typeLine ?? '';
  return BASIC_PRODUCES.filter(([sub]) => type.includes(sub)).map(([, m]) => m);
}

/** Mana sources: how many cards make each color. A dual land counts once for
 *  each of its colors. `produced` maps scryfallId → Scryfall's produced_mana. */
export function manaSources(deck: Deck, produced: Record<string, string[]>): Slice[] {
  const counts: Record<string, number> = {};
  for (const c of countedCards(deck)) {
    const fromScryfall = produced[c.scryfallId];
    const colors = fromScryfall
      ? (fromScryfall.filter((m) => 'WUBRGC'.includes(m)) as ManaColor[])
      : producedFromTypeLine(c);
    for (const m of new Set(colors)) counts[m] = (counts[m] ?? 0) + c.quantity;
  }
  return ([...COLOR_ORDER, 'C'] as ManaColor[])
    .map((m) => ({ key: m, label: COLOR_NAMES[m], value: counts[m] ?? 0, color: MANA_VAR[m], mana: m }))
    .filter((s) => s.value > 0);
}

// Fixed order → fixed color: a type keeps its color whatever else is present.
// Dark-surface categorical steps (see the dataviz reference palette).
const TYPES: { key: string; label: string; color: string }[] = [
  { key: 'Creature', label: 'Criaturas', color: '#3987e5' },
  { key: 'Instant', label: 'Instantâneas', color: '#d95926' },
  { key: 'Sorcery', label: 'Feitiços', color: '#199e70' },
  { key: 'Artifact', label: 'Artefatos', color: '#c98500' },
  { key: 'Enchantment', label: 'Encantamentos', color: '#d55181' },
  { key: 'Planeswalker', label: 'Planeswalkers', color: '#9085e9' },
  { key: 'Land', label: 'Terrenos', color: '#008300' },
  { key: 'Other', label: 'Outros', color: '#e66767' },
];

/** One primary type per card: lands first (Dryad Arbor, artifact lands),
 *  then creatures (artifact/enchantment creatures), then the rest. */
function primaryType(card: DeckCard): string {
  const t = card.typeLine?.split('—')[0] ?? '';
  for (const key of ['Land', 'Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Artifact', 'Enchantment']) {
    if (t.includes(key)) return key;
  }
  return 'Other';
}

export function cardTypes(deck: Deck): Slice[] {
  const counts: Record<string, number> = {};
  for (const c of countedCards(deck)) {
    const k = primaryType(c);
    counts[k] = (counts[k] ?? 0) + c.quantity;
  }
  return TYPES.map((t) => ({ ...t, value: counts[t.key] ?? 0 })).filter((s) => s.value > 0);
}

const producedCache: Record<string, string[]> = {};

/** Loads Scryfall's produced_mana for the deck's cards (batches of 75, cached
 *  for the session). Cards Scryfall says make no mana map to []. */
export async function loadProducedMana(cards: DeckCard[]): Promise<Record<string, string[]>> {
  const missing = [...new Set(cards.map((c) => c.scryfallId))].filter((id) => !(id in producedCache));
  for (let i = 0; i < missing.length; i += 75) {
    const chunk = missing.slice(i, i + 75);
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: chunk.map((id) => ({ id })) }),
    });
    if (!res.ok) throw new Error(`Scryfall respondeu ${res.status}`);
    const data = await res.json();
    for (const card of (data?.data ?? []) as { id: string; produced_mana?: string[] }[]) {
      producedCache[card.id] = card.produced_mana ?? [];
    }
  }
  return { ...producedCache };
}
