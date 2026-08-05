import { Deck, DeckCard } from '../../types';
import { maxCopiesAllowed } from './anyNumberCards';

export interface DeckError {
  id: string;
  message: string;
  /** scryfallIds of the offending cards, for the red-ring highlight. Empty for deck-wide issues. */
  cardIds: string[];
}

const BASIC_LAND_NAMES = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

/** Copies this card may legally hold: basics and "any number of" cards are
 *  unbounded, Seven Dwarves/Nazgûl have their own caps, everything else is 1. */
function copyLimit(card: DeckCard): number {
  const baseName = card.name.replace(/^Snow-Covered /, '');
  if (BASIC_LAND_NAMES.has(baseName)) return Infinity;
  return maxCopiesAllowed(card.name, card.typeLine ?? null);
}

/**
 * Lightweight Commander-format validation, in the spirit of Archidekt's deck
 * errors list.
 */
export function validateDeck(deck: Deck): DeckError[] {
  const errors: DeckError[] = [];
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  if (totalCards !== 100) {
    errors.push({
      id: 'count',
      message: `O deck precisa ter exatamente 100 cartas (tem ${totalCards}).`,
      cardIds: [],
    });
  }

  if (!deck.commanderId) {
    errors.push({ id: 'no-commander', message: 'Nenhum comandante definido para este deck.', cardIds: [] });
  }

  const identity = deck.colorIdentity ?? [];
  // Skip the color-identity check when there's no commander: identity is empty,
  // so every colored card would be flagged — noise on top of the "no commander"
  // error, which already covers that state.
  const outOfIdentity = deck.commanderId
    ? deck.cards.filter((c) => (c.colorIdentity ?? []).some((color) => !identity.includes(color)))
    : [];
  if (outOfIdentity.length > 0) {
    errors.push({
      id: 'color-identity',
      message: `${outOfIdentity.length} ${outOfIdentity.length === 1 ? 'carta está' : 'cartas estão'} fora da identidade de cor do comandante.`,
      cardIds: outOfIdentity.map((c) => c.scryfallId),
    });
  }

  const tooMany = deck.cards.filter((c) => c.quantity > copyLimit(c));
  if (tooMany.length > 0) {
    // Cards with their own cap (Seven Dwarves, Nazgûl) break a different rule
    // than the plain singleton one, so say which limit was passed.
    const message =
      tooMany.length === 1
        ? `"${tooMany[0].name}" excede o limite de ${copyLimit(tooMany[0])} ${copyLimit(tooMany[0]) === 1 ? 'cópia' : 'cópias'}.`
        : `${tooMany.length} cartas excedem o limite de cópias permitido.`;
    errors.push({ id: 'singleton', message, cardIds: tooMany.map((c) => c.scryfallId) });
  }

  return errors;
}

/** Union of scryfallIds flagged by any error, for the red-ring highlight. */
export function collectErrorCardIds(errors: DeckError[]): Set<string> {
  const ids = new Set<string>();
  for (const e of errors) for (const id of e.cardIds) ids.add(id);
  return ids;
}
