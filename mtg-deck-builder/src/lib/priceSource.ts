import { ScryfallCard } from '../types';
import { usdToBrlLabel, ligaMagicUrl } from './usdBrl';

export type PriceSource = 'ligamagic' | 'tcgplayer';

const STORAGE_KEY = 'price-source';
const DEFAULT_SOURCE: PriceSource = 'ligamagic';

export function getPriceSource(): PriceSource {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'ligamagic' || stored === 'tcgplayer' ? stored : DEFAULT_SOURCE;
}

export function setPriceSource(source: PriceSource): void {
  localStorage.setItem(STORAGE_KEY, source);
}

/** TCGplayer search URL (front face name for DFCs) — Scryfall's own default
 *  price source, already shown in USD without needing a currency conversion. */
export function tcgplayerUrl(cardName: string): string {
  const front = cardName.split(' // ')[0];
  return `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(front)}`;
}

/** Unified clickable price label + link for a card, honoring the user's
 *  chosen reference store — used by SearchTab/EdhrecSheet's compact card
 *  rows. Returns null when no price data is available for that source. */
export function getCardPriceLink(
  card: ScryfallCard,
  usdBrlRate: number | null,
  source: PriceSource
): { label: string; url: string } | null {
  if (source === 'ligamagic') {
    const brl = usdToBrlLabel(card.prices?.usd, usdBrlRate);
    if (!brl) return null;
    return { label: brl, url: ligaMagicUrl(card.name) };
  }
  const usd = card.prices?.usd;
  if (!usd) return null;
  const value = parseFloat(usd);
  if (!isFinite(value)) return null;
  return { label: `US$ ${value.toFixed(2)}`, url: tcgplayerUrl(card.name) };
}
