import React from 'react';
import { Loader2, Plus, Minus } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Deck } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';
import { parseDecklist, fetchCardsByName } from './importUtils';

type Mode = 'add' | 'remove';
type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; changed: number; notFound: string[] }
  | { kind: 'error'; msg: string };

interface BulkListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

/** lowercase + strip diacritics + straighten apostrophes, so a typed
 *  "Lim-Dul's Vault" matches the stored "Lim-Dûl's Vault". */
function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’]/g, "'")
    .toLowerCase()
    .trim();
}

export function BulkListSheet({ isOpen, onClose, deck }: BulkListSheetProps) {
  const { importCards, setCardQuantity } = useDeckStore();
  const [mode, setMode] = React.useState<Mode>('add');
  const [text, setText] = React.useState('');
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });

  React.useEffect(() => {
    if (isOpen) {
      setText('');
      setPhase({ kind: 'idle' });
      setMode('add');
    }
  }, [isOpen]);

  async function apply() {
    const parsed = parseDecklist(text);
    if (parsed.length === 0) return;

    if (mode === 'add') {
      setPhase({ kind: 'loading' });
      try {
        const { toImport, notFound } = await fetchCardsByName(parsed);
        importCards(deck.id, toImport);
        const changed = toImport.reduce((a, c) => a + c.quantity, 0);
        setPhase({ kind: 'done', changed, notFound });
      } catch {
        setPhase({ kind: 'error', msg: 'Não foi possível consultar o Scryfall. Tente novamente.' });
      }
      return;
    }

    // Remove: match each listed card by name and drop ALL its copies. (For
    // trimming a couple of basics, use the [-] button on the card instead.)
    const byNorm = new Map(deck.cards.map((c) => [normName(c.name), c]));
    let changed = 0;
    const notFound: string[] = [];
    for (const p of parsed) {
      const key = normName(p.name);
      const card = byNorm.get(key);
      if (card) {
        setCardQuantity(deck.id, card.scryfallId, 0);
        byNorm.delete(key);
        changed += card.quantity;
      } else {
        notFound.push(p.name);
      }
    }
    setPhase({ kind: 'done', changed, notFound });
  }

  const loading = phase.kind === 'loading';
  const done = phase.kind === 'done' ? phase : null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Editar por lista">
      <div style={{ padding: '8px 20px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {([
            { m: 'add' as Mode, label: 'Adicionar', icon: <Plus size={15} /> },
            { m: 'remove' as Mode, label: 'Remover', icon: <Minus size={15} /> },
          ]).map(({ m, label, icon }) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => { setMode(m); setPhase({ kind: 'idle' }); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
                  backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          {mode === 'add'
            ? 'Cole uma lista (ex.: "1 Sol Ring", "2 Forest") — as cartas são adicionadas ao deck atual.'
            : 'Cole os nomes das cartas a remover — todas as cópias de cada carta listada saem do deck.'}
        </p>

        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); if (phase.kind !== 'idle') setPhase({ kind: 'idle' }); }}
          placeholder={mode === 'add' ? '1 Sol Ring\n1 Arcane Signet\n5 Forest' : 'Sol Ring\nArcane Signet'}
          rows={7}
          style={{
            width: '100%',
            resize: 'vertical',
            padding: '10px 12px',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: '13px',
            lineHeight: 1.6,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {phase.kind === 'error' && (
          <p style={{ fontSize: '13px', color: 'var(--error)', margin: 0 }}>{phase.msg}</p>
        )}

        {done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, fontWeight: 600 }}>
              {mode === 'add'
                ? `${done.changed} carta(s) adicionada(s).`
                : `${done.changed} carta(s) removida(s).`}
            </p>
            {done.notFound.length > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {mode === 'add' ? 'Não encontradas' : 'Não estavam no deck'}: {done.notFound.join(', ')}
              </p>
            )}
          </div>
        )}

        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled={!text.trim() || loading}
          onClick={apply}
          leftIcon={loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : undefined}
        >
          {loading ? 'Processando…' : mode === 'add' ? 'Adicionar ao deck' : 'Remover do deck'}
        </Button>
      </div>
    </BottomSheet>
  );
}
