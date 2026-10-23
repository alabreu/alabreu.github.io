import React from 'react';
import { Deck, ScryfallCard } from '../../types';
import { useDeckStore, materializeCategories } from '../../store/useDeckStore';
import { scryfallToDeckCard } from '../card/cardUtils';
import { MoveToSectionSheet } from './MoveToSectionSheet';

/** Section shortcut for cards shown outside the decklist (search, EDHREC):
 *  picking a section moves the card there if it's already in the deck, or
 *  adds it straight into that section if it isn't. */
export function useSectionPicker(deck: Deck) {
  const { addCard, addCategory, updateCardCategory } = useDeckStore();
  const [card, setCard] = React.useState<ScryfallCard | null>(null);

  const existing = card ? deck.cards.find((c) => c.scryfallId === card.id) ?? null : null;
  const sections = materializeCategories(deck).filter(
    (c) => c !== 'Comandante' && c !== existing?.category
  );

  function handlePick(category: string) {
    if (!card) return;
    addCategory(deck.id, category); // idempotent — creates the section if new
    if (existing) updateCardCategory(deck.id, card.id, category);
    else addCard(deck.id, scryfallToDeckCard(card, category));
    setCard(null);
  }

  /** The commander keeps its structural section, so it gets no shortcut. */
  const canPick = (c: ScryfallCard) => c.id !== deck.commanderId && c.id !== deck.partnerId;

  const sheet = (
    <MoveToSectionSheet
      isOpen={card !== null}
      onClose={() => setCard(null)}
      sections={sections}
      count={1}
      cardName={card?.name}
      title={card && !existing ? `Adicionar "${card.name}" em…` : undefined}
      onPick={handlePick}
    />
  );

  return { open: setCard, canPick, sheet };
}
