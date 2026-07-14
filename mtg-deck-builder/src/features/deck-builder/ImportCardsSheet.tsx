import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { useDeckStore } from '../../store/useDeckStore';
import { parseDecklist, fetchCardsByName } from './importUtils';

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; total: number }
  | { kind: 'error' }
  | { kind: 'done'; added: number; notFound: string[]; sections: string[] };

interface ImportCardsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
}

export function ImportCardsSheet({ isOpen, onClose, deckId }: ImportCardsSheetProps) {
  const { importCards } = useDeckStore();
  const [text, setText] = React.useState('');
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });

  function handleClose() {
    onClose();
    setTimeout(() => {
      setText('');
      setPhase({ kind: 'idle' });
    }, 350);
  }

  async function handleImport() {
    const parsed = parseDecklist(text);
    if (!parsed.length) return;
    setPhase({ kind: 'loading', total: parsed.length });
    try {
      const { toImport, notFound, sections } = await fetchCardsByName(parsed);
      importCards(deckId, toImport);
      setPhase({ kind: 'done', added: toImport.length, notFound, sections });
    } catch {
      setPhase({ kind: 'error' });
    }
  }

  const parsedCount = React.useMemo(() => parseDecklist(text).length, [text]);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Importar cartas" maxHeight="92dvh">
      <div style={{ padding: '20px 20px 32px' }}>

        {phase.kind === 'idle' && (
          <>
            {/* Format hint */}
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
              Cole sua lista no formato padrão. Uma carta por linha; linhas com{' '}
              <span style={{ fontFamily: 'monospace' }}>// Nome</span> criam e distribuem seções.
              Tags no final da linha, como <span style={{ fontFamily: 'monospace' }}>[Ramp]</span>{' '}
              (formato Moxfield), também são reconhecidas.
            </p>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                margin: '0 0 6px',
              }}
            >
              Exemplo:
            </p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'var(--text-muted)',
                padding: '0 0 0 12px',
                marginBottom: '18px',
                lineHeight: 1.7,
                borderLeft: '2px solid var(--border-subtle)',
              }}
            >
              // Terrenos<br />
              36 Island<br />
              <br />
              // Ramp<br />
              1 Sol Ring<br />
              4 Lightning Bolt [Removal]
            </div>

            {/* Textarea */}
            <textarea
              placeholder="Cole sua lista aqui..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                minHeight: '180px',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '16px',
                lineHeight: 1.65,
                color: 'var(--text-primary)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
            />

            {parsedCount > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {parsedCount} {parsedCount === 1 ? 'entrada detectada' : 'entradas detectadas'}
              </p>
            )}

            <div style={{ marginTop: '20px' }}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={parsedCount === 0}
                onClick={handleImport}
              >
                {parsedCount > 0 ? `Importar ${parsedCount} cartas` : 'Importar cartas'}
              </Button>
            </div>
          </>
        )}

        {phase.kind === 'loading' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              padding: '48px 0',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ display: 'flex' }}
            >
              <Loader2 size={36} style={{ color: 'var(--accent)' }} />
            </motion.div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Buscando {phase.total} {phase.total === 1 ? 'carta' : 'cartas'}...
            </p>
          </div>
        )}

        {phase.kind === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <AlertCircle size={24} style={{ color: 'var(--error)', flexShrink: 0 }} />
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                Não foi possível buscar as cartas. Verifique sua conexão e tente novamente.
              </p>
            </div>
            <Button variant="secondary" size="md" fullWidth onClick={() => setPhase({ kind: 'idle' })}>
              Tentar novamente
            </Button>
          </div>
        )}

        {phase.kind === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Success banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                backgroundColor: 'rgba(47, 174, 121, 0.07)',
                border: '1px solid rgba(47, 174, 121, 0.18)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <CheckCircle2 size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {phase.added} {phase.added === 1 ? 'carta adicionada' : 'cartas adicionadas'}
                </p>
                {phase.notFound.length > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {phase.notFound.length} não {phase.notFound.length === 1 ? 'encontrada' : 'encontradas'}
                  </p>
                )}
                {phase.sections.length > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Distribuídas em: {phase.sections.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Not found list */}
            {phase.notFound.length > 0 && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(248, 113, 113, 0.05)',
                  border: '1px solid rgba(248, 113, 113, 0.14)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertCircle size={13} style={{ color: 'var(--error)', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--error)' }}>
                    Não encontradas
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {phase.notFound.map((name) => (
                    <span
                      key={name}
                      style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '4px' }}>
              <Button variant="primary" size="lg" fullWidth onClick={handleClose}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
