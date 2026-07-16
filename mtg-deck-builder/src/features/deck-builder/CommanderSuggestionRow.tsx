import React from 'react';
import { Crown } from 'lucide-react';
import { CardImage } from '../card/CardImage';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { SymbolText } from '../../design-system/components/ManaSymbol';
import { ScryfallCard } from '../../types';
import { canBeCommanderCard } from '../card/cardUtils';

interface CommanderSuggestionRowProps {
  cards: ScryfallCard[];
  onPick: (card: ScryfallCard) => void;
}

/** Renders the commander(s) the Tutor suggested in a paragraph/bullet as a
 *  small tappable row. Tapping a card OPENS it for reading (art + type +
 *  oracle) — it does NOT select it. Selection is an explicit action via the
 *  "Definir como comandante" button inside the preview, so the user can browse
 *  cards without accidentally committing to one. Cards that can't legally be a
 *  commander are filtered out rather than shown as a misleading suggestion. */
export function CommanderSuggestionRow({ cards, onPick }: CommanderSuggestionRowProps) {
  const eligible = cards.filter(canBeCommanderCard);
  const [selected, setSelected] = React.useState<ScryfallCard | null>(null);
  const [open, setOpen] = React.useState(false);

  if (eligible.length === 0) return null;

  const normalImg = (c: ScryfallCard) =>
    c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal || c.image_uris?.small || null;
  const oracle = selected
    ? selected.oracle_text ||
      (selected.card_faces?.map((f) => f.oracle_text).filter(Boolean).join('\n//\n') ?? '')
    : '';

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
        {eligible.map((c) => {
          const imageUrl = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || null;
          return (
            <div key={c.id} style={{ width: '78px', flexShrink: 0 }}>
              <CardImage
                imageUrl={imageUrl}
                name={c.name}
                onClick={() => {
                  setSelected(c);
                  setOpen(true);
                }}
              />
            </div>
          );
        })}
      </div>

      <BottomSheet isOpen={open} onClose={() => setOpen(false)} title={selected?.name ?? ''} maxHeight="92dvh">
        {selected && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ maxWidth: '200px', width: '100%', margin: '0 auto' }}>
              <CardImage imageUrl={normalImg(selected)} name={selected.name} size="normal" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Tipo
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selected.type_line}</span>
            </div>

            {oracle && (
              <div
                style={{
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  <SymbolText text={oracle} />
                </p>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<Crown size={15} />}
              onClick={() => {
                setOpen(false);
                onPick(selected);
              }}
            >
              Definir como comandante
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
