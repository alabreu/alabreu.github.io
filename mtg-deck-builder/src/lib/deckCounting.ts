import { Deck, DeckCard } from '../types';

// Sections the user switched off ("Conta no deck") work like extra
// sideboards: their cards stay in the list but are left out of the card
// count, the 100-card validation, the stats and the main export block.

/** The commander section always counts — excluding it would leave the deck
 *  without a commander for every check that matters. */
export function isCategoryCounted(deck: Pick<Deck, 'excludedCategories'>, category: string): boolean {
  if (category === 'Comandante') return true;
  return !(deck.excludedCategories ?? []).includes(category);
}

/** Cards that count toward the deck (everything outside excluded sections). */
export function countedCards(deck: Pick<Deck, 'cards' | 'excludedCategories'>): DeckCard[] {
  if (!deck.excludedCategories || deck.excludedCategories.length === 0) return deck.cards;
  return deck.cards.filter((c) => isCategoryCounted(deck, c.category));
}

/** Cards parked in excluded sections. */
export function uncountedCards(deck: Pick<Deck, 'cards' | 'excludedCategories'>): DeckCard[] {
  if (!deck.excludedCategories || deck.excludedCategories.length === 0) return [];
  return deck.cards.filter((c) => !isCategoryCounted(deck, c.category));
}

export function countedTotal(deck: Pick<Deck, 'cards' | 'excludedCategories'>): number {
  return countedCards(deck).reduce((s, c) => s + c.quantity, 0);
}
