import { ScryfallCard } from '../types';
import { usdToBrlLabel, ligaMagicUrl } from './usdBrl';
import { safeGetItem, safeSetItem } from './safeStorage';

export type PriceSource = 'ligamagic' | 'tcgplayer';

const STORAGE_KEY = 'price-source';
const DEFAULT_SOURCE: PriceSource = 'ligamagic';

export function getPriceSource(): PriceSource {
  const stored = safeGetItem(STORAGE_KEY);
  return stored === 'ligamagic' || stored === 'tcgplayer' ? stored : DEFAULT_SOURCE;
}

export function setPriceSource(source: PriceSource): void {
  safeSetItem(STORAGE_KEY, source);
}

/** Optional Impact.com deep-link template for the TCGplayer affiliate program
 *  (docs.tcgplayer.com/docs/tcgplayer-affiliate-program). Set
 *  VITE_TCGPLAYER_AFFILIATE_BASE to the tracking link Impact gives you for
 *  deep-linking, ending in "?u=" (e.g.
 *  "https://tcgplayer.pxf.io/c/1234567/654321/4321?u=") — the destination
 *  TCGplayer URL is appended, URL-encoded, after that prefix. Unset by
 *  default, in which case tcgplayerUrl() returns a plain (non-affiliate) link
 *  — no behavior change until this is configured. */
const AFFILIATE_BASE = import.meta.env.VITE_TCGPLAYER_AFFILIATE_BASE;

/** TCGplayer search URL (front face name for DFCs) — Scryfall's own default
 *  price source, already shown in USD without needing a currency conversion.
 *  Wrapped as an Impact affiliate deep link when VITE_TCGPLAYER_AFFILIATE_BASE
 *  is configured (see above), otherwise a plain link. */
export function tcgplayerUrl(cardName: string): string {
  const front = cardName.split(' // ')[0];
  const destination = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(front)}`;
  return AFFILIATE_BASE ? `${AFFILIATE_BASE}${encodeURIComponent(destination)}` : destination;
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
