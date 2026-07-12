import React from 'react';
import { CardImage } from '../card/CardImage';
import { ScryfallCard } from '../../types';
import { canBeCommanderCard } from '../card/cardUtils';

interface CommanderSuggestionRowProps {
  cards: ScryfallCard[];
  onPick: (card: ScryfallCard) => void;
}

/** Renders the commander(s) the Tutor suggested in a paragraph/bullet as a
 *  small tappable row — picking one hands off to the manual "new deck" form
 *  with that commander pre-filled, so naming + creation stays in one place.
 *  Cards that can't legally be a commander are filtered out rather than
 *  shown as a misleading tappable suggestion. */
export function CommanderSuggestionRow({ cards, onPick }: CommanderSuggestionRowProps) {
  const eligible = cards.filter(canBeCommanderCard);
  if (eligible.length === 0) return null;

  return (
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
      {eligible.map((c) => {
        const imageUrl = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || null;
        return (
          <div key={c.id} style={{ width: '78px', flexShrink: 0 }}>
            <CardImage imageUrl={imageUrl} name={c.name} onClick={() => onPick(c)} />
          </div>
        );
      })}
    </div>
  );
}
