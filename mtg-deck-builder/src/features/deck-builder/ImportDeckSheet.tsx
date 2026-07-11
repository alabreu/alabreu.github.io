import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { useDeckStore } from '../../store/useDeckStore';
import { parseDecklist, fetchCardsByName } from './importUtils';

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; total: number }
  | { kind: 'done'; added: number; notFound: string[]; deckId: string; sections: string[] };

interface ImportDeckSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDeckSheet({ isOpen, onClose }: ImportDeckSheetProps) {
  const { createDeck, importCards } = useDeckStore();
  const navigate = useNavigate();
  const [deckName, setDeckName] = React.useState('');
  const [text, setText] = React.useState('');
  const [phase, setPhase] = React.useState<Phase>({ kind: 'idle' });
  const [nameError, setNameError] = React.useState('');

  function handleClose() {
    onClose();
    setTimeout(() => {
      setDeckName('');
      setText('');
      setPhase({ kind: 'idle' });
      setNameError('');
    }, 350);
  }

  async function handleImport() {
    const trimmedName = deckName.trim();
    if (!trimmedName) {
      setNameError('Insira um nome para o deck');
      return;
    }
    const parsed = parseDecklist(text);
    if (!parsed.length) return;

    setPhase({ kind: 'loading', total: parsed.length });
    try {
      const { toImport, notFound, sections } = await fetchCardsByName(parsed);
      const deck = createDeck(trimmedName);
      importCards(deck.id, toImport);
      setPhase({ kind: 'done', added: toImport.length, notFound, deckId: deck.id, sections });
    } catch {
      setPhase({ kind: 'idle' });
    }
  }

  const parsedCount = React.useMemo(() => parseDecklist(text).length, [text]);
  const canImport = deckName.trim().length > 0 && parsedCount > 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Importar deck" maxHeight="92dvh">
      <div style={{ padding: '20px 20px 32px' }}>

        {phase.kind === 'idle' && (
          <>
            {/* Deck name */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                }}
              >
                Nome do deck
              </label>
              <input
                autoFocus
                placeholder="Ex: Atraxa Proliferação"
                value={deckName}
                onChange={(e) => {
                  setDeckName(e.target.value);
                  if (nameError) setNameError('');
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--surface-1)',
                  border: `1px solid ${nameError ? 'var(--error)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '11px 12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => {
                  if (!nameError) e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onBlur={(e) => {
                  if (!nameError) e.currentTarget.style.borderColor = 'var(--border-default)';
                }}
              />
              {nameError && (
                <p style={{ fontSize: '12px', color: 'var(--error)', marginTop: '5px' }}>
                  {nameError}
                </p>
              )}
            </div>

            {/* Format hint */}
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px',
              }}
            >
              Lista de cartas
            </label>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
              Cole no formato padrão — uma carta por linha; linhas com{' '}
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
                marginBottom: '14px',
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

            <textarea
              placeholder="Cole sua lista aqui..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                minHeight: '160px',
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
                disabled={!canImport}
                onClick={handleImport}
              >
                {parsedCount > 0
                  ? `Criar deck com ${parsedCount} cartas`
                  : 'Criar deck'}
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

        {phase.kind === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                backgroundColor: 'rgba(74, 222, 128, 0.07)',
                border: '1px solid rgba(74, 222, 128, 0.18)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <CheckCircle2 size={24} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Deck criado com {phase.added} {phase.added === 1 ? 'carta' : 'cartas'}
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
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  handleClose();
                  navigate(`/deck/${phase.deckId}`);
                }}
              >
                Abrir deck
              </Button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
