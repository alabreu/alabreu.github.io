import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { useDeckStore } from '../../store/useDeckStore';
import { DeckCard, ManaColor, ScryfallCard } from '../../types';

interface ParsedLine {
  quantity: number;
  name: string;
}

function parseDecklist(text: string): ParsedLine[] {
  const result: ParsedLine[] = [];
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;
    const match = line.match(/^(\d+)[xX]?\s+(.+)$/);
    if (!match) continue;
    const quantity = Math.min(99, Math.max(1, parseInt(match[1], 10)));
    const name = match[2]
      .replace(/\s+\([A-Z0-9]{2,6}\)\s+\d+.*/, '')
      .replace(/\s+\*.*$/, '')
      .trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ quantity, name });
  }
  return result;
}

function scryfallToDeckCard(scryfall: ScryfallCard, quantity: number): DeckCard {
  const face = scryfall.card_faces?.[0];
  const validColors = ['W', 'U', 'B', 'R', 'G', 'C'];
  const typeLine = scryfall.type_line ?? face?.type_line ?? '';
  return {
    scryfallId: scryfall.id,
    name: scryfall.name,
    quantity,
    category: typeLine.includes('Land') ? 'Terrenos' : 'Outros',
    imageUrl: (scryfall.image_uris ?? face?.image_uris)?.normal ?? null,
    artCropUrl: (scryfall.image_uris ?? face?.image_uris)?.art_crop ?? null,
    manaCost: scryfall.mana_cost ?? face?.mana_cost ?? null,
    typeLine,
    cmc: scryfall.cmc,
    colorIdentity: scryfall.color_identity.filter(
      (c): c is ManaColor => validColors.includes(c)
    ),
  };
}

async function fetchCardsByName(
  parsed: ParsedLine[]
): Promise<{ toImport: DeckCard[]; notFound: string[] }> {
  const identifiers = parsed.map((p) => ({ name: p.name }));
  const foundCards: ScryfallCard[] = [];
  const notFoundNames: string[] = [];

  for (let i = 0; i < identifiers.length; i += 75) {
    const batch = identifiers.slice(i, i + 75);
    const res = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch }),
    });
    if (!res.ok) throw new Error('Scryfall error');
    const data = await res.json();
    foundCards.push(...(data.data as ScryfallCard[]));
    for (const missing of data.not_found ?? []) {
      if (missing.name) notFoundNames.push(missing.name as string);
    }
  }

  const byName = new Map(foundCards.map((c) => [c.name.toLowerCase(), c]));

  const toImport: DeckCard[] = [];
  for (const { name, quantity } of parsed) {
    const scryfall = byName.get(name.toLowerCase());
    if (scryfall) toImport.push(scryfallToDeckCard(scryfall, quantity));
  }

  return { toImport, notFound: notFoundNames };
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading'; total: number }
  | { kind: 'done'; added: number; notFound: string[] };

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
      const { toImport, notFound } = await fetchCardsByName(parsed);
      importCards(deckId, toImport);
      setPhase({ kind: 'done', added: toImport.length, notFound });
    } catch {
      setPhase({ kind: 'idle' });
    }
  }

  const parsedCount = React.useMemo(() => parseDecklist(text).length, [text]);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Importar cartas" maxHeight="92vh">
      <div style={{ padding: '20px 20px 32px' }}>

        {phase.kind === 'idle' && (
          <>
            {/* Format hint */}
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.5 }}>
              Cole sua lista no formato padrão. Uma carta por linha:
            </p>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                marginBottom: '16px',
                lineHeight: 1.7,
              }}
            >
              1 Sol Ring<br />
              4 Lightning Bolt<br />
              36 Island
            </div>

            {/* Textarea */}
            <textarea
              placeholder={'Cole sua lista aqui...\n\n1 Sol Ring\n4 Lightning Bolt\n36 Island'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                display: 'block',
                width: '100%',
                minHeight: '180px',
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

        {phase.kind === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Success banner */}
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
                  {phase.added} {phase.added === 1 ? 'carta adicionada' : 'cartas adicionadas'}
                </p>
                {phase.notFound.length > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {phase.notFound.length} não {phase.notFound.length === 1 ? 'encontrada' : 'encontradas'}
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
