import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { DeckError } from './deckValidation';

interface DeckErrorsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  errors: DeckError[];
  /** Select the offending cards in the decklist so they can be fixed in bulk. */
  onSelectCards: (cardIds: string[]) => void;
}

export function DeckErrorsSheet({ isOpen, onClose, errors, onSelectCards }: DeckErrorsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Erros do deck" maxHeight="70dvh">
      <div style={{ padding: '8px 20px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {errors.map((e) => {
          // Only errors that point at specific cards can be acted on. Deck-wide
          // ones ("needs 100 cards", "no commander") carry no cardIds, and
          // there is nothing to select for them.
          const actionable = e.cardIds.length > 0;
          const body = (
            <>
              <AlertCircle size={15} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '1px' }} />
              <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4, textAlign: 'left' }}>
                {e.message}
                {actionable && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--error)', fontWeight: 600 }}>
                    Selecionar {e.cardIds.length === 1 ? 'a carta' : `as ${e.cardIds.length} cartas`}
                  </span>
                )}
              </span>
              {actionable && (
                <ChevronRight size={15} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '1px' }} />
              )}
            </>
          );
          const shared: React.CSSProperties = {
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px 14px',
            backgroundColor: 'rgba(248, 113, 113, 0.06)',
            border: '1px solid rgba(248, 113, 113, 0.18)',
            borderRadius: 'var(--radius-md)',
          };

          return actionable ? (
            <button
              key={e.id}
              onClick={() => onSelectCards(e.cardIds)}
              style={{
                ...shared,
                width: '100%',
                cursor: 'pointer',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {body}
            </button>
          ) : (
            <div key={e.id} style={shared}>
              {body}
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
}
