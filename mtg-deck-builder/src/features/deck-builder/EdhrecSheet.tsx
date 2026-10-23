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
import { useSectionPicker } from './useSectionPicker';

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
  // Re-read on open so a store change in Settings applies without reopening the deck.
  const [priceSource, setPriceSource] = React.useState(() => getPriceSource());

  React.useEffect(() => {
    if (!isOpen) return;
    setPriceSource(getPriceSource());
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
  const [failedKeys, setFailedKeys] = React.useState<Set<string>>(() => new Set());
  // A chip tapped before its section loaded jumps the hydration queue.
  const [priorityHeader, setPriorityHeader] = React.useState<string | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const chipRowRef = React.useRef<HTMLDivElement | null>(null);
  const chipRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const sectionPicker = useSectionPicker(deck);
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

  // Every list is shown in one long page (like edhrec.com), so hydrate them
  // all via Scryfall, one at a time from the top — or the tapped one first.
  React.useEffect(() => {
    if (!isOpen || !lists || hydrating) return;
    const pending = (l: EdhrecList) => !hydrated[hydKey(l.header)] && !failedKeys.has(hydKey(l.header));
    const next =
      lists.find((l) => l.header === priorityHeader && pending(l)) ?? lists.find(pending);
    if (!next) return;
    const key = hydKey(next.header);
    setHydrating(true);
    hydrateCards(next.cards.slice(0, MAX_CARDS_PER_LIST).map((c) => c.name))
      .then((cards) => setHydrated((prev) => ({ ...prev, [key]: cards })))
      // Failures aren't cached: "Tentar novamente" clears the key for a retry
      .catch(() => setFailedKeys((prev) => new Set(prev).add(key)))
      .finally(() => setHydrating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lists, hydrated, failedKeys, hydrating, priorityHeader, cacheKey]);

  // EDHREC uses front-face names; Scryfall returns 'Front // Back' for DFCs
  const synergyByList = React.useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const l of lists ?? []) {
      const map: Record<string, number> = {};
      for (const c of l.cards) if (typeof c.synergy === 'number') map[c.name] = c.synergy;
      out[l.header] = map;
    }
    return out;
  }, [lists]);
  const synergyFor = (header: string, name: string): number | undefined =>
    synergyByList[header]?.[name] ?? synergyByList[header]?.[name.split(' // ')[0]];

  // Scroll-spy: the chip of the section at the top of the sheet lights up.
  React.useEffect(() => {
    if (!isOpen || !lists) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const header = (top.target as HTMLElement).dataset.header;
        if (header) setActiveHeader(header);
      },
      { rootMargin: '-120px 0px -65% 0px' }
    );
    for (const l of lists) {
      const el = sectionRefs.current[l.header];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [isOpen, lists]);

  // Keep the active chip in view inside the horizontally scrolling row.
  React.useEffect(() => {
    const row = chipRowRef.current;
    const chip = activeHeader ? chipRefs.current[activeHeader] : null;
    if (!row || !chip) return;
    const target = chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeHeader]);

  function jumpTo(header: string) {
    setActiveHeader(header);
    setPriorityHeader(header);
    sectionRefs.current[header]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCard(card: ScryfallCard, header: string) {
    const qty = deckCardMap[card.id] ?? 0;
    const imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
    const synergy = synergyFor(header, card.name);
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
            onMove={sectionPicker.canPick(card) ? (e) => { e.stopPropagation(); sectionPicker.open(card); } : undefined}
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
              style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}
            >
              {priceLink.label}
            </a>
          )}
        </div>
      </div>
    );
  }

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
                ref={chipRowRef}
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  padding: '12px 20px',
                  flexShrink: 0,
                  // Shortcuts stay on top while the long list scrolls under them
                  position: 'sticky',
                  top: 0,
                  zIndex: 3,
                  backgroundColor: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {lists.map((l) => {
                  const active = l.header === activeHeader;
                  return (
                    <button
                      key={l.header}
                      ref={(el) => { chipRefs.current[l.header] = el; }}
                      onClick={() => jumpTo(l.header)}
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
              {loadingLists && (
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

              {/* Every list, one after the other, like the site */}
              {!loadingLists && lists?.map((l) => {
                const key = hydKey(l.header);
                const listCards = hydrated[key];
                const failed = failedKeys.has(key);
                return (
                  <div
                    key={l.header}
                    ref={(el) => { sectionRefs.current[l.header] = el; }}
                    data-header={l.header}
                    // Lands below the sticky chip row when jumped to
                    style={{ scrollMarginTop: '64px', marginBottom: '24px' }}
                  >
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      {translateHeader(l.header)}
                      <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {Math.min(l.cards.length, MAX_CARDS_PER_LIST)}
                      </span>
                    </h3>

                    {failed ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '16px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', margin: 0 }}>
                          Não foi possível carregar as cartas desta categoria.
                        </p>
                        <button
                          onClick={() => setFailedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; })}
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
                    ) : !listCards ? (
                      <div style={{ display: 'grid', gridTemplateColumns: viewMode === '2col' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)', gap: '12px' }}>
                        {Array.from({ length: viewMode === '2col' ? 2 : 1 }).map((_, i) => (
                          <SkeletonCard key={i} />
                        ))}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: viewMode === '2col' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
                          gap: '12px',
                        }}
                      >
                        {listCards.map((card) => renderCard(card, l.header))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </BottomSheet>

      {sectionPicker.sheet}

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
