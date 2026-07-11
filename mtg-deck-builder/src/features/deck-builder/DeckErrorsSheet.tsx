import { AlertCircle } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { DeckError } from './deckValidation';

interface DeckErrorsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  errors: DeckError[];
}

export function DeckErrorsSheet({ isOpen, onClose, errors }: DeckErrorsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Erros do deck" maxHeight="70dvh">
      <div style={{ padding: '8px 20px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {errors.map((e) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: 'rgba(248, 113, 113, 0.06)',
              border: '1px solid rgba(248, 113, 113, 0.18)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <AlertCircle size={15} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '1px' }} />
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {e.message}
            </span>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
