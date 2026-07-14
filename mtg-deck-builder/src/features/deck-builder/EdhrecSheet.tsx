import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Sparkles, Square, LayoutGrid } from 'lucide-react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { SkeletonCard } from '../../design-system/components/Skeleton';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { scryfallToDeckCard, defaultCategoryFor } from '../card/cardUtils';
import { CardActionsOverlay } from '../card/CardActionsOverlay';
import { getUsdBrlRate } from '../../lib/usdBrl';
import { getPriceSource, getCardPriceLink } from '../../lib/priceSource';
import { Deck, ScryfallCard } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';
import { EdhrecList, fetchEdhrecLists, hydrateCards, translateHeader } from './edhrec';
import { validateDeck, collectErrorCardIds } from './deckValidation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

const MAX_CARDS_PER_LIST = 60;

type ViewMode = '1col' | '2col';

/** EDHREC favicon with a Sparkles fallback if it can't load. */
export function EdhrecIcon({ size = 16 }: { size?: number }) {
  const [errored, setErrored] = React.useState(false);
  if (errored) return <Sparkles size={size - 1} />;
  return (
    <img
      src="https://edhrec.com/favicon.ico"
      alt="EDHREC"
      draggable={false}
      onError={() => setErrored(true)}
      style={{ width: size, height: size, display: 'block', borderRadius: '3px', userSelect: 'none' }}
    />
  );
}

export function EdhrecSheet({ isOpen, onClose, deck }: Props) {
  const { addCard, removeCard } = useDeckStore();
  const [viewMode, setViewMode] = React.useState<ViewMode>('2col');
  const [usdBrlRate, setUsdBrlRate] = React.useState<number | null>(null);
  const priceSource = React.useMemo(() => getPriceSource(), []);

  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getUsdBrlRate().then((rate) => {
      if (!cancelled) setUsdBrlRate(rate);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const [lists, setLists] = React.useState<EdhrecList[] | null>(null);
  const [listsError, setListsError] = React.useState<string | null>(null);
  const [loadingLists, setLoadingLists] = React.useState(false);
  const [activeHeader, setActiveHeader] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState<Record<string, ScryfallCard[]>>({});
  const [hydrating, setHydrating] = React.useState(false);
  const [hydrateFailedKey, setHydrateFailedKey] = React.useState<string | null>(null);
  const [selectedCard, setSelectedCard] = React.useState<ScryfallCard | null>(null);
  const [cardSheetOpen, setCardSheetOpen] = React.useState(false);

  const listsCache = React.useRef<Record<string, EdhrecList[]>>({});
  const cacheKey = `${deck.commanderName ?? ''}|${deck.partnerName ?? ''}`;
  // Hydration cache is keyed per commander+list so switching commanders never
  // shows the previous commander's cards under the new one's categories
  const hydKey = (header: string) => `${cacheKey}|${header}`;

  const deckCardMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of deck.cards) map[c.scryfallId] = c.quantity;
    return map;
  }, [deck.cards]);

  const errorCardIds = React.useMemo(() => collectErrorCardIds(validateDeck(deck)), [deck]);

  // Load recommendation lists when opened
  React.useEffect(() => {
    if (!isOpen || !deck.commanderName) return;
    const applyLists = (data: EdhrecList[]) => {
      setLists(data);
      // Keep the current chip only if it exists for this commander
      setActiveHeader((prev) =>
        prev && data.some((l) => l.header === prev) ? prev : data[0]?.header ?? null
      );
    };
    if (listsCache.current[cacheKey]) {
      applyLists(listsCache.current[cacheKey]);
      return;
    }
    let cancelled = false;
    setLoadingLists(true);
    setListsError(null);
    fetchEdhrecLists(deck.commanderName, deck.partnerName)
      .then((data) => {
        if (cancelled) return;
        listsCache.current[cacheKey] = data;
        applyLists(data);
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
    if (!lists || !activeHeader) return;
    const key = hydKey(activeHeader);
    if (hydrated[key] || hydrateFailedKey === key) return;
    const list = lists.find((l) => l.header === activeHeader);
    if (!list) return;
    let cancelled = false;
    setHydrating(true);
    hydrateCards(list.cards.slice(0, MAX_CARDS_PER_LIST).map((c) => c.name))
      .then((cards) => {
        // Store under the captured key even if the user switched chips — the
        // data stays correct and the fetch isn't wasted
        setHydrated((prev) => ({ ...prev, [key]: cards }));
      })
      .catch(() => {
        // Don't cache failures: allow retry instead of a session-long empty list
        if (!cancelled) setHydrateFailedKey(key);
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, activeHeader, hydrated, hydrateFailedKey, cacheKey]);

  const activeList = lists?.find((l) => l.header === activeHeader) ?? null;
  const synergyByName = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of activeList?.cards ?? []) {
      if (typeof c.synergy === 'number') map[c.name] = c.synergy;
    }
    return map;
  }, [activeList]);

  // EDHREC uses front-face names; Scryfall returns 'Front // Back' for DFCs
  const synergyFor = (name: string): number | undefined =>
    synergyByName[name] ?? synergyByName[name.split(' // ')[0]];

  const cards = activeHeader ? hydrated[hydKey(activeHeader)] : undefined;
  const hydrateFailed = activeHeader ? hydrateFailedKey === hydKey(activeHeader) : false;

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Sugestões do EDHREC"
        maxHeight="92dvh"
        headerAction={
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {([
              { mode: '1col' as ViewMode, icon: <Square size={13} /> },
              { mode: '2col' as ViewMode, icon: <LayoutGrid size={13} /> },
            ]).map(({ mode, icon }, i) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '26px',
                  backgroundColor: viewMode === mode ? 'var(--surface-2)' : 'transparent',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border-default)' : 'none',
                  cursor: 'pointer',
                  color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        }
      >
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

              {!loadingLists && !hydrating && hydrateFailed && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '32px 16px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                    Não foi possível carregar as cartas desta categoria.
                  </p>
                  <button
                    onClick={() => setHydrateFailedKey(null)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-2)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {!loadingLists && !hydrating && cards && cards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: viewMode === '2col' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
                    gap: '12px',
                  }}
                >
                  {cards.map((card) => {
                    const qty = deckCardMap[card.id] ?? 0;
                    const imageUrl =
                      card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
                    const synergy = synergyFor(card.name);

                    const priceLink = getCardPriceLink(card, usdBrlRate, priceSource);

                    return (
                      <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                        <div style={{ position: 'relative' }}>
                          <CardImage
                            imageUrl={imageUrl}
                            name={card.name}
                            size="normal"
                            onClick={() => {
                              setSelectedCard(card);
                              setCardSheetOpen(true);
                            }}
                            showQuantityBadge={qty > 0 ? qty : undefined}
                            highlightInDeck={qty > 0}
                            highlightError={errorCardIds.has(card.id)}
                          />
                          <CardActionsOverlay
                            qty={qty}
                            onAdd={(e) => {
                              e.stopPropagation();
                              addCard(deck.id, scryfallToDeckCard(card, defaultCategoryFor(card)));
                            }}
                            onRemove={(e) => {
                              e.stopPropagation();
                              removeCard(deck.id, card.id);
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
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
                          {priceLink && (
                            <a
                              href={priceLink.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--accent)',
                                textDecoration: 'none',
                                flexShrink: 0,
                              }}
                            >
                              {priceLink.label}
                            </a>
                          )}
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
