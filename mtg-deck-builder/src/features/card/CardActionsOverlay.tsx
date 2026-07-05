import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface Props {
  qty: number;
  onAdd: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
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
 * bottom-right corner of the card's art box (~55% of the frame height),
 * so the position scales with any tile size.
 */
export function CardActionsOverlay({ qty, onAdd, onRemove }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        right: '5%',
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
      <button onClick={onAdd} aria-label="Adicionar" style={{ ...btnStyle, color: 'var(--accent)' }}>
        <Plus size={14} />
      </button>
    </div>
  );
}
