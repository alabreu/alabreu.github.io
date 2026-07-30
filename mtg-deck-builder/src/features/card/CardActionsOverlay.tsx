import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface Props {
  qty: number;
  onAdd: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
  /** Hide the [+] button — used in the decklist, where only basic lands may
   *  have more than one copy (Commander singleton rule). Defaults to true. */
  showAdd?: boolean;
}

const btnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(15,15,15,0.72)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
};

/**
 * Add/remove buttons floating over the card image, anchored to the
 * bottom-left corner of the card's art box (~55% of the frame height),
 * so the position scales with any tile size. (The top-right corner is
 * reserved for the bulk-selection checkbox.)
 */
export function CardActionsOverlay({ qty, onAdd, onRemove, showAdd = true }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '5%',
        top: '55%',
        transform: 'translateY(-100%)',
        display: 'flex',
        gap: '5px',
        zIndex: 2,
      }}
    >
      {qty > 0 && (
        <button onClick={onRemove} aria-label="Remover" style={{ ...btnStyle, color: '#f87171' }}>
          <Minus size={14} />
        </button>
      )}
      {showAdd && (
        <button onClick={onAdd} aria-label="Adicionar" style={{ ...btnStyle, color: 'var(--accent)' }}>
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}
