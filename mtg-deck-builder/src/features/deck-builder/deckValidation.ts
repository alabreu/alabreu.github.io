import { Deck, DeckCard } from '../../types';

export interface DeckError {
  id: string;
  message: string;
  /** scryfallIds of the offending cards, for the red-ring highlight. Empty for deck-wide issues. */
  cardIds: string[];
}

const BASIC_LAND_NAMES = new Set(['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes']);

function isBasicLand(card: DeckCard): boolean {
  const baseName = card.name.replace(/^Snow-Covered /, '');
  if (BASIC_LAND_NAMES.has(baseName)) return true;
  return card.typeLine?.includes('Basic Land') ?? false;
}

/**
 * Lightweight Commander-format validation, in the spirit of Archidekt's deck
 * errors list. Doesn't special-case cards with "any number of copies" text
 * (e.g. Relentless Rats, Persistent Petitioners) — that would need oracle
 * text we don't persist on DeckCard — so those show as a singleton warning
 * until we track that.
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
  const outOfIdentity = deck.cards.filter((c) =>
    (c.colorIdentity ?? []).some((color) => !identity.includes(color))
  );
  if (outOfIdentity.length > 0) {
    errors.push({
      id: 'color-identity',
      message: `${outOfIdentity.length} ${outOfIdentity.length === 1 ? 'carta está' : 'cartas estão'} fora da identidade de cor do comandante.`,
      cardIds: outOfIdentity.map((c) => c.scryfallId),
    });
  }

  const tooMany = deck.cards.filter((c) => c.quantity > 1 && !isBasicLand(c));
  if (tooMany.length > 0) {
    errors.push({
      id: 'singleton',
      message: `${tooMany.length} ${tooMany.length === 1 ? 'carta excede' : 'cartas excedem'} o limite de 1 cópia (formato singleton).`,
      cardIds: tooMany.map((c) => c.scryfallId),
    });
  }

  return errors;
}

/** Union of scryfallIds flagged by any error, for the red-ring highlight. */
export function collectErrorCardIds(errors: DeckError[]): Set<string> {
  const ids = new Set<string>();
  for (const e of errors) for (const id of e.cardIds) ids.add(id);
  return ids;
}
