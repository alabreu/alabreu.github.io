import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDeckStore } from '../store/useDeckStore';
import { ScryfallCard } from '../types';
import { Button } from '../design-system/components/Button';
import { scryfallToDeckCard } from '../features/card/cardUtils';
import { CONTENT_MAX_WIDTH } from '../design-system/responsive';

export default function NewDeck() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createDeck, setCommander } = useDeckStore();

  // The Tutor's commander-picker flow hands off here with a chosen card
  // pre-filled (see ChooseNewDeckMethod / TutorDeckChat), skipping straight
  // to naming the deck.
  const prefilledCommander = (location.state as { commander?: ScryfallCard } | null)?.commander ?? null;

  const [deckName, setDeckName] = React.useState('');
  const [nameError, setNameError] = React.useState('');
  const [commanderQuery, setCommanderQuery] = React.useState('');
  const [results, setResults] = React.useState<ScryfallCard[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selected, setSelected] = React.useState<ScryfallCard | null>(prefilledCommander);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!commanderQuery.trim() || selected) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const q = encodeURIComponent(`is:commander game:paper ${commanderQuery.trim()}`);
        const res = await fetch(
          `https://api.scryfall.com/cards/search?q=${q}&order=name&unique=cards`
        );
        if (res.ok) {
          const data = await res.json();
          setResults((data.data as ScryfallCard[]).slice(0, 24));
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [commanderQuery, selected]);

  function handleSelect(card: ScryfallCard) {
    setSelected(card);
    setCommanderQuery('');
    setResults([]);
  }

  function handleClear() {
    setSelected(null);
    setCommanderQuery('');
    setResults([]);
  }

  function handleCreate() {
    const trimmed = deckName.trim();
    if (!trimmed) {
      setNameError('Insira um nome para o deck');
      return;
    }
    const deck = createDeck(trimmed);
    if (selected) setCommander(deck.id, scryfallToDeckCard(selected, 'Comandante'));
    navigate(`/deck/${deck.id}`);
  }

  const selectedArt = selected
    ? (selected.image_uris ?? selected.card_faces?.[0]?.image_uris)?.art_crop
    : null;

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--bg-base)',
          paddingTop: 'max(14px, env(safe-area-inset-top))',
          paddingBottom: '14px',
          paddingLeft: '16px',
          paddingRight: '16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            maxWidth: CONTENT_MAX_WIDTH,
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              padding: '4px',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Novo deck
          </h1>
        </div>
      </header>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 20px 140px',
          display: 'flex',
          flexDirection: 'column',
          gap: '36px',
          width: '100%',
          maxWidth: CONTENT_MAX_WIDTH,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* Deck name */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px',
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
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            style={{
              width: '100%',
              fontSize: '24px',
              fontWeight: 600,
              fontFamily: 'inherit',
              color: 'var(--text-primary)',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${nameError ? 'var(--error)' : deckName ? 'var(--accent)' : 'var(--border-default)'}`,
              outline: 'none',
              padding: '6px 0 10px',
              letterSpacing: '-0.02em',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
          />
          {nameError && (
            <p style={{ fontSize: '12px', color: 'var(--error)', marginTop: '6px' }}>
              {nameError}
            </p>
          )}
        </div>

        {/* Commander */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Comandante
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>
              opcional
            </span>
          </div>

          {/* Selected commander card */}
          <AnimatePresence>
            {selected && selectedArt && (
              <motion.div
                key="selected"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'relative',
                  height: '160px',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  marginBottom: '12px',
                  border: '1px solid var(--border-default)',
                }}
              >
                <img
                  src={selectedArt}
                  alt={selected.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'top center',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: '#fff',
                        margin: 0,
                        letterSpacing: '-0.02em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {selected.name}
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.55)',
                        margin: '3px 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {selected.type_line}
                    </p>
                  </div>
                  <button
                    onClick={handleClear}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.8)',
                      flexShrink: 0,
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search input */}
          {!selected && (
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                placeholder="Buscar comandante..."
                value={commanderQuery}
                onChange={(e) => setCommanderQuery(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--surface-1)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  padding: '11px 12px 11px 38px',
                  boxSizing: 'border-box',
                  letterSpacing: '-0.01em',
                }}
              />
              {commanderQuery && (
                <button
                  onClick={() => setCommanderQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {isSearching && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
              Buscando...
            </p>
          )}

          {/* Results list */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  marginTop: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                {results.map((card, i) => {
                  const face = card.card_faces?.[0];
                  const thumb = (card.image_uris ?? face?.image_uris)?.art_crop;
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleSelect(card)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom:
                          i < results.length - 1
                            ? '1px solid var(--border-subtle)'
                            : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'background-color 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={card.name}
                          style={{
                            width: '46px',
                            height: '33px',
                            objectFit: 'cover',
                            objectPosition: 'top center',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '46px',
                            height: '33px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--surface-2)',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {card.name}
                        </p>
                        <p
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            margin: '2px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {card.type_line}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky footer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '14px 20px',
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          backgroundColor: 'var(--bg-base)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, margin: '0 auto', boxSizing: 'border-box' }}>
          <Button
            variant="white"
            size="lg"
            fullWidth
            disabled={!deckName.trim()}
            onClick={handleCreate}
          >
            Criar deck
          </Button>
        </div>
      </div>
    </div>
  );
}
