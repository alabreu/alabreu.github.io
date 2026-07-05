import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, AlertCircle, Sparkles } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { SkeletonCard } from '../../design-system/components/Skeleton';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { scryfallToDeckCard, defaultCategoryFor } from '../card/cardUtils';
import { Deck, ScryfallCard } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';
import { EdhrecList, fetchEdhrecLists, hydrateCards, translateHeader } from './edhrec';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

const MAX_CARDS_PER_LIST = 60;

export function EdhrecSheet({ isOpen, onClose, deck }: Props) {
  const { addCard, removeCard } = useDeckStore();

  const [lists, setLists] = React.useState<EdhrecList[] | null>(null);
  const [listsError, setListsError] = React.useState<string | null>(null);
  const [loadingLists, setLoadingLists] = React.useState(false);
  const [activeHeader, setActiveHeader] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState<Record<string, ScryfallCard[]>>({});
  const [hydrating, setHydrating] = React.useState(false);
  const [selectedCard, setSelectedCard] = React.useState<ScryfallCard | null>(null);
  const [cardSheetOpen, setCardSheetOpen] = React.useState(false);

  const listsCache = React.useRef<Record<string, EdhrecList[]>>({});
  const cacheKey = `${deck.commanderName ?? ''}|${deck.partnerName ?? ''}`;

  const deckCardMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of deck.cards) map[c.scryfallId] = c.quantity;
    return map;
  }, [deck.cards]);

  // Load recommendation lists when opened
  React.useEffect(() => {
    if (!isOpen || !deck.commanderName) return;
    if (listsCache.current[cacheKey]) {
      setLists(listsCache.current[cacheKey]);
      setActiveHeader((prev) => prev ?? listsCache.current[cacheKey][0]?.header ?? null);
      return;
    }
    let cancelled = false;
    setLoadingLists(true);
    setListsError(null);
    fetchEdhrecLists(deck.commanderName, deck.partnerName)
      .then((data) => {
        if (cancelled) return;
        listsCache.current[cacheKey] = data;
        setLists(data);
        setActiveHeader(data[0]?.header ?? null);
      })
      .catch((e) => {
        if (!cancelled) setListsError(e instanceof Error ? e.message : 'Erro ao consultar o EDHREC');
      })
      .finally(() => {
        if (!cancelled) setLoadingLists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, cacheKey, deck.commanderName, deck.partnerName]);

  // Hydrate the active list via Scryfall
  React.useEffect(() => {
    if (!lists || !activeHeader || hydrated[activeHeader]) return;
    const list = lists.find((l) => l.header === activeHeader);
    if (!list) return;
    let cancelled = false;
    setHydrating(true);
    hydrateCards(list.cards.slice(0, MAX_CARDS_PER_LIST).map((c) => c.name))
      .then((cards) => {
        if (!cancelled) setHydrated((prev) => ({ ...prev, [activeHeader]: cards }));
      })
      .catch(() => {
        if (!cancelled) setHydrated((prev) => ({ ...prev, [activeHeader]: [] }));
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lists, activeHeader, hydrated]);

  const activeList = lists?.find((l) => l.header === activeHeader) ?? null;
  const synergyByName = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of activeList?.cards ?? []) {
      if (typeof c.synergy === 'number') map[c.name] = c.synergy;
    }
    return map;
  }, [activeList]);

  const cards = activeHeader ? hydrated[activeHeader] : undefined;

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Sugestões do EDHREC" maxHeight="92vh">
        {!deck.commanderName ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '48px 24px', textAlign: 'center' }}>
            <Sparkles size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Defina um comandante</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
              As sugestões do EDHREC são baseadas no comandante do deck.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '60vh' }}>
            {/* Category chips */}
            {lists && lists.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  padding: '12px 20px',
                  flexShrink: 0,
                }}
              >
                {lists.map((l) => {
                  const active = l.header === activeHeader;
                  return (
                    <button
                      key={l.header}
                      onClick={() => setActiveHeader(l.header)}
                      style={{
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        borderRadius: '999px',
                        backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
                        color: active ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {translateHeader(l.header)}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ padding: '4px 16px 32px' }}>
              {(loadingLists || hydrating) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              )}

              {listsError && !loadingLists && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 24px', textAlign: 'center' }}>
                  <AlertCircle size={32} style={{ color: 'var(--error)' }} />
                  <p style={{ color: 'var(--error)', fontSize: '14px' }}>{listsError}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    O EDHREC pode não ter página para este comandante.
                  </p>
                </div>
              )}

              {!loadingLists && !hydrating && cards && cards.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '32px 16px' }}>
                  Não foi possível carregar as cartas desta categoria.
                </p>
              )}

              {!loadingLists && !hydrating && cards && cards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}
                >
                  {cards.map((card) => {
                    const qty = deckCardMap[card.id] ?? 0;
                    const imageUrl =
                      card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
                    const synergy = synergyByName[card.name];

                    return (
                      <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <CardImage
                          imageUrl={imageUrl}
                          name={card.name}
                          size="normal"
                          onClick={() => {
                            setSelectedCard(card);
                            setCardSheetOpen(true);
                          }}
                          showQuantityBadge={qty > 0 ? qty : undefined}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingBottom: '2px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                              {card.name}
                            </p>
                            {typeof synergy === 'number' && (
                              <p style={{ fontSize: '10px', color: synergy >= 0 ? 'var(--accent)' : 'var(--text-muted)', margin: '1px 0 0' }}>
                                Sinergia {synergy >= 0 ? '+' : ''}{Math.round(synergy * 100)}%
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                            {qty > 0 && (
                              <button
                                onClick={() => removeCard(deck.id, card.id)}
                                style={{
                                  width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  backgroundColor: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)',
                                  borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--error)',
                                }}
                              >
                                <Minus size={11} />
                              </button>
                            )}
                            <button
                              onClick={() => addCard(deck.id, scryfallToDeckCard(card, defaultCategoryFor(card)))}
                              style={{
                                width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--accent)',
                              }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Card detail */}
      <CardBottomSheet
        isOpen={cardSheetOpen}
        onClose={() => setCardSheetOpen(false)}
        card={selectedCard}
        deckId={deck.id}
        existingCard={
          selectedCard ? deck.cards.find((c) => c.scryfallId === selectedCard.id) ?? null : null
        }
        deck={deck}
      />
    </>
  );
}
