import React from 'react';
import { Search } from 'lucide-react';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { ScryfallCard, Deck } from '../../types';
import { buildCardNameQuery } from './coachCardMentions';

const OVERFLOW_THRESHOLD = 10;

interface CardMentionRowProps {
  cards: ScryfallCard[];
  deck: Deck;
  onOpenSearch: (query: string) => void;
}

/** Renders the card(s) a Coach paragraph/bullet mentioned: a single small
 *  preview for one card, a horizontal carousel for a handful, or — past
 *  OVERFLOW_THRESHOLD — a button that opens Search filtered to all of them
 *  instead of cramming a huge row into the chat. */
export function CardMentionRow({ cards, deck, onOpenSearch }: CardMentionRowProps) {
  const [selected, setSelected] = React.useState<ScryfallCard | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  if (cards.length === 0) return null;

  if (cards.length > OVERFLOW_THRESHOLD) {
    return (
      <button
        onClick={() => onOpenSearch(buildCardNameQuery(cards.map((c) => c.name)))}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 12px',
          margin: '2px 0 10px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-full)',
          color: 'var(--accent)',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <Search size={13} />
        Ver {cards.length} cartas na busca
      </button>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '2px 2px 10px',
          margin: '2px 0 4px',
        }}
      >
        {cards.map((c) => {
          const imageUrl = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || null;
          const existing = deck.cards.find((dc) => dc.scryfallId === c.id);
          return (
            <div key={c.id} style={{ width: '78px', flexShrink: 0 }}>
              <CardImage
                imageUrl={imageUrl}
                name={c.name}
                onClick={() => {
                  setSelected(c);
                  setSheetOpen(true);
                }}
                showQuantityBadge={existing?.quantity}
                highlightInDeck={!!existing}
              />
            </div>
          );
        })}
      </div>

      <CardBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        card={selected}
        deckId={deck.id}
        existingCard={selected ? deck.cards.find((dc) => dc.scryfallId === selected.id) ?? null : null}
        deck={deck}
      />
    </>
  );
}
