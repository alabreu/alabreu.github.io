import React from 'react';
import { Copy, Check } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Deck } from '../../types';
import { buildDecklistText } from './exportDeck';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

export function ExportDeckSheet({ isOpen, onClose, deck }: Props) {
  const [copied, setCopied] = React.useState(false);
  const [includeSectionHeaders, setIncludeSectionHeaders] = React.useState(true);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const text = React.useMemo(
    () => buildDecklistText(deck, { includeSectionHeaders }),
    [deck, includeSectionHeaders]
  );
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for contexts without Clipboard API permission
      textareaRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar deck"
      maxHeight="92vh"
    >
      <div style={{ padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          {totalCards} {totalCards === 1 ? 'carta' : 'cartas'}. Toque em "Copiar tudo" ou selecione
          manualmente o trecho que quiser copiar.
        </p>

        <button
          onClick={() => setIncludeSectionHeaders((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 14px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
            Incluir títulos das seções
          </span>
          <span
            style={{
              width: '40px',
              height: '24px',
              borderRadius: '999px',
              flexShrink: 0,
              backgroundColor: includeSectionHeaders ? 'var(--accent)' : 'var(--surface-3)',
              position: 'relative',
              transition: 'background-color 0.15s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '3px',
                left: includeSectionHeaders ? '19px' : '3px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#fff',
                transition: 'left 0.15s',
              }}
            />
          </span>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          style={{
            display: 'block',
            width: '100%',
            minHeight: '340px',
            resize: 'vertical',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: 1.65,
            color: 'var(--text-primary)',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        <Button
          variant={copied ? 'secondary' : 'primary'}
          size="lg"
          fullWidth
          leftIcon={copied ? <Check size={16} /> : <Copy size={15} />}
          onClick={handleCopy}
        >
          {copied ? 'Copiado!' : 'Copiar tudo'}
        </Button>
      </div>
    </BottomSheet>
  );
}
