import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Layers, MapPin, Zap, RefreshCw, LayoutGrid, LayoutList, Square, Pencil, XCircle, Minus, Plus, Check } from 'lucide-react';

type ViewMode = '2col' | '1col' | 'list';
import { Deck, DeckCard, ScryfallCard } from '../../types';
import { CardImage } from '../card/CardImage';
import { CardActionsOverlay } from '../card/CardActionsOverlay';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { Badge } from '../../design-system/components/Badge';
import { ManaGroup } from '../../design-system/components/ManaSymbol';
import { useDeckStore, materializeCategories } from '../../store/useDeckStore';
import { useLongPress } from '../../lib/useLongPress';
import { validateDeck, collectErrorCardIds } from './deckValidation';
import { DeckErrorsSheet } from './DeckErrorsSheet';

interface DecklistTabProps {
  deck: Deck;
  forcedExpandAll?: boolean;
  /** Bulk-selection: ids of the currently selected cards. */
  selectedIds: Set<string>;
  /** Toggle a card's membership in the bulk selection. */
  onToggleSelect: (scryfallId: string) => void;
  /** Power-user shortcut: holding a section header opens "Gerenciar seções". */
  onManageSections: () => void;
}

function groupCardsByCategory(cards: DeckCard[]): Record<string, DeckCard[]> {
  const groups: Record<string, DeckCard[]> = {};
  for (const card of cards) {
    if (!groups[card.category]) groups[card.category] = [];
    groups[card.category].push(card);
  }
  return groups;
}

function deckCardToScryfall(card: DeckCard): ScryfallCard {
  return {
    id: card.scryfallId,
    oracle_id: card.oracleId ?? undefined,
    name: card.name,
    mana_cost: card.manaCost,
    cmc: card.cmc,
    type_line: card.typeLine ?? '',
    oracle_text: null,
    colors: null,
    color_identity: card.colorIdentity ?? [],
    power: null,
    toughness: null,
    loyalty: null,
    rarity: 'common',
    set_name: '',
    keywords: card.keywords,
    image_uris: card.imageUrl
      ? {
          small: card.imageUrl,
          normal: card.imageUrl,
          large: card.imageUrl,
          art_crop: card.artCropUrl ?? card.imageUrl,
          border_crop: card.imageUrl,
        }
      : undefined,
    legalities: { commander: 'legal' },
  };
}

/** In Commander only basic lands may exceed one copy, so the quick [+] button
 *  is offered only for them; every other card just gets a [-] (remove). */
function isBasicLand(card: DeckCard): boolean {
  const t = card.typeLine ?? '';
  return t.includes('Basic') && t.includes('Land');
}

const rowActionBtnStyle = (color: string): React.CSSProperties => ({
  width: '26px',
  height: '26px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  color,
  WebkitTapHighlightColor: 'transparent',
});

/** Bulk-selection checkbox that floats over the top-right of a card's art.
 *  Always visible so a tap starts (or extends) a bulk selection. It sits inside
 *  the art box, BELOW the title bar (which ends ~11.5% down the frame), so it
 *  never covers the mana cost. */
function SelectCheckbox({
  selected,
  onToggle,
  variant = 'overlay',
}: {
  selected: boolean;
  onToggle: (e: React.MouseEvent) => void;
  /** 'overlay' floats over card art; 'inline' sits in a flex row (list view). */
  variant?: 'overlay' | 'inline';
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={selected ? 'Desmarcar carta' : 'Selecionar carta'}
      aria-pressed={selected}
      style={{
        ...(variant === 'overlay'
          ? { position: 'absolute', top: '14.5%', right: '5%', zIndex: 3 }
          : { position: 'relative', flexShrink: 0 }),
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        backgroundColor: selected ? 'var(--accent)' : 'rgba(15,15,15,0.72)',
        backdropFilter: variant === 'overlay' ? 'blur(6px)' : undefined,
        WebkitBackdropFilter: variant === 'overlay' ? 'blur(6px)' : undefined,
        border: selected ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.35)',
        cursor: 'pointer',
        color: selected ? '#0f0f0f' : 'transparent',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background-color 0.12s, border-color 0.12s',
      }}
    >
      <Check size={15} strokeWidth={3} />
    </button>
  );
}

const FlippableCard = React.memo(function FlippableCard({
  card,
  onCardClick,
  onQuickAdd,
  onQuickRemove,
  hasError,
  selected,
  onToggleSelect,
  selectionMode,
}: {
  card: DeckCard;
  onCardClick: (card: DeckCard) => void;
  onQuickAdd: (card: DeckCard) => void;
  onQuickRemove: (card: DeckCard) => void;
  hasError?: boolean;
  selected: boolean;
  onToggleSelect: (scryfallId: string) => void;
  selectionMode: boolean;
}) {
  const [flipped, setFlipped] = React.useState(false);
  const selectable = card.category !== 'Comandante';
  // Hold to start selecting; once in selection mode the whole card toggles, so
  // repeat selections don't depend on hitting the small checkbox.
  const press = useLongPress({
    onLongPress: () => { if (selectable) onToggleSelect(card.scryfallId); },
    onClick: () => {
      if (selectionMode && selectable) onToggleSelect(card.scryfallId);
      else onCardClick(card);
    },
  });
  // Only real double-faced cards have a stored back image; split/adventure
  // cards have ' // ' names but a single face
  const backImageUrl = card.backImageUrl || null;
  const isDfc = Boolean(backImageUrl);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ minWidth: 0, overflow: 'hidden' }}
    >
      {/* 3-D flip container */}
      <div style={{ perspective: '900px', overflow: 'hidden' }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
          style={{ position: 'relative', transformStyle: 'preserve-3d' }}
        >
          {/* Front face */}
          <div
            style={{
              position: 'relative',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            {/* Only the artwork is pressable. The overlay buttons below are
                siblings stacked on top, not descendants, so their clicks never
                reach this element's capture handler. */}
            <div {...press} style={{ ...press.style, cursor: 'pointer' }}>
              <CardImage
                imageUrl={card.imageUrl}
                name={card.name}
                size="normal"
                showQuantityBadge={card.quantity > 1 ? card.quantity : undefined}
                highlightError={hasError}
              />
            </div>
            {/* Selected state: an accent stroke tracing the card's rounded
                corners plus a light accent wash over the art. Painted as an
                overlay (not an outline/box-shadow on the image) so it sits
                above the artwork — same reason as the ring in CardImage. */}
            {selected && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '4.8%',
                  border: '2px solid var(--accent)',
                  backgroundColor: 'var(--accent-subtle)',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              />
            )}
            {/* Quantity controls are noise while bulk-editing — the task there
                is picking cards, not tuning copies. */}
            {!selectionMode && (
              <CardActionsOverlay
                qty={card.quantity}
                showAdd={isBasicLand(card)}
                onAdd={(e) => { e.stopPropagation(); onQuickAdd(card); }}
                onRemove={(e) => { e.stopPropagation(); onQuickRemove(card); }}
              />
            )}
            {/* The commander is structural (managed via the card sheet), so it
                is not offered for bulk actions. */}
            {selectable && (
              <SelectCheckbox
                selected={selected}
                onToggle={(e) => { e.stopPropagation(); onToggleSelect(card.scryfallId); }}
              />
            )}
          </div>
          {/* Back face */}
          {isDfc && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <CardImage
                imageUrl={backImageUrl}
                name={card.name}
                size="normal"
                onClick={() => onCardClick(card)}
              />
            </div>
          )}
        </motion.div>
      </div>

      <p
        style={{
          marginTop: '4px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {card.name}
      </p>

      {/* Scryfall-style Transform button */}
      {isDfc && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setFlipped((v) => !v);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            margin: '5px auto 0',
            padding: '3px 9px 3px 7px',
            borderRadius: '999px',
            backgroundColor: 'transparent',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '10px',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
            width: 'fit-content',
          }}
        >
          <motion.div
            animate={{ rotate: flipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
            style={{ display: 'flex' }}
          >
            <RefreshCw size={9} />
          </motion.div>
          Transformar
        </button>
      )}
    </motion.div>
  );
});

const ListCardRow = React.memo(function ListCardRow({
  card,
  onCardClick,
  onQuickAdd,
  onQuickRemove,
  hasError,
  selected,
  onToggleSelect,
  selectionMode,
}: {
  card: DeckCard;
  onCardClick: (card: DeckCard) => void;
  onQuickAdd: (card: DeckCard) => void;
  onQuickRemove: (card: DeckCard) => void;
  hasError?: boolean;
  selected: boolean;
  onToggleSelect: (scryfallId: string) => void;
  selectionMode: boolean;
}) {
  const selectable = card.category !== 'Comandante';
  const press = useLongPress({
    onLongPress: () => { if (selectable) onToggleSelect(card.scryfallId); },
    onClick: () => {
      if (selectionMode && selectable) onToggleSelect(card.scryfallId);
      else onCardClick(card);
    },
  });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '7px 4px',
        width: '100%',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: selected ? 'var(--accent-subtle)' : 'transparent',
        borderRadius: selected ? 'var(--radius-sm)' : 0,
      }}
    >
      {/* Commander is structural — not bulk-selectable. Keep a spacer so the
          other rows stay aligned. */}
      {selectable ? (
        <SelectCheckbox
          selected={selected}
          variant="inline"
          onToggle={(e) => { e.stopPropagation(); onToggleSelect(card.scryfallId); }}
        />
      ) : (
        <div style={{ width: '24px', flexShrink: 0 }} />
      )}

      {/* Tappable info area — opens the card sheet, or toggles the selection
          while bulk-editing. Holding it starts a selection. */}
      <motion.button
        whileTap={{ scale: 0.985 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...press}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: 0,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
          ...press.style,
        }}
      >
        <div style={{ width: '36px', flexShrink: 0, borderRadius: '3px', overflow: 'hidden' }}>
          <CardImage imageUrl={card.imageUrl} name={card.name} size="small" highlightError={hasError} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {card.name}
          </p>
          {card.typeLine && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '2px 0 0' }}>
              {card.typeLine}
            </p>
          )}
        </div>
      </motion.button>

      {/* Quantity + quick actions — hidden while bulk-editing (see the grid) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {card.quantity > 1 && <Badge variant="default" size="sm">{card.quantity}</Badge>}
        {!selectionMode && (
          <>
            <button onClick={() => onQuickRemove(card)} aria-label="Remover uma cópia" style={rowActionBtnStyle('#f87171')}>
              <Minus size={14} />
            </button>
            {isBasicLand(card) && (
              <button onClick={() => onQuickAdd(card)} aria-label="Adicionar uma cópia" style={rowActionBtnStyle('var(--accent)')}>
                <Plus size={14} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

interface CategorySectionProps {
  category: string;
  cards: DeckCard[];
  expanded: boolean;
  onToggle: (category: string) => void;
  onCardClick: (card: DeckCard) => void;
  onQuickAdd: (card: DeckCard) => void;
  onQuickRemove: (card: DeckCard) => void;
  viewMode: ViewMode;
  errorCardIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (scryfallId: string) => void;
  selectionMode: boolean;
  onManageSections: () => void;
}

const CategorySection = React.memo(function CategorySection({ category, cards, expanded, onToggle, onCardClick, onQuickAdd, onQuickRemove, viewMode, errorCardIds, selectedIds, onToggleSelect, selectionMode, onManageSections }: CategorySectionProps) {
  const totalQty = cards.reduce((s, c) => s + c.quantity, 0);
  // Hidden power-user shortcut: hold a section header to manage sections.
  const headerPress = useLongPress({
    onLongPress: onManageSections,
    onClick: () => onToggle(category),
  });

  return (
    <div style={{ marginBottom: '4px' }}>
      <button
        {...headerPress}
        style={{
          ...headerPress.style,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px 8px 4px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          fontSize: '16px',
          fontWeight: 600,
          letterSpacing: '0.01em',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ flex: 1 }}>{category}</span>
        <Badge variant="default" size="sm">
          {totalQty}
        </Badge>
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            key="cards"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {viewMode === 'list' ? (
              <div style={{ padding: '4px 0' }}>
                {cards.map((card) => (
                  <ListCardRow
                    key={card.scryfallId}
                    card={card}
                    onCardClick={onCardClick}
                    onQuickAdd={onQuickAdd}
                    onQuickRemove={onQuickRemove}
                    hasError={errorCardIds.has(card.scryfallId)}
                    selected={selectedIds.has(card.scryfallId)}
                    onToggleSelect={onToggleSelect}
                    selectionMode={selectionMode}
                  />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: viewMode === '2col' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
                  gap: '8px',
                  padding: '8px 0 4px',
                }}
              >
                {cards.map((card) => (
                  <FlippableCard
                    key={card.scryfallId}
                    card={card}
                    onCardClick={onCardClick}
                    onQuickAdd={onQuickAdd}
                    onQuickRemove={onQuickRemove}
                    hasError={errorCardIds.has(card.scryfallId)}
                    selected={selectedIds.has(card.scryfallId)}
                    onToggleSelect={onToggleSelect}
                    selectionMode={selectionMode}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export function DecklistTab({ deck, forcedExpandAll, selectedIds, onToggleSelect, onManageSections }: DecklistTabProps) {
  const selectionMode = selectedIds.size > 0;
  const { updateDeck, addCard, removeCard } = useDeckStore();
  const [selectedCard, setSelectedCard] = React.useState<DeckCard | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = React.useState<ViewMode>('2col');
  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(deck.name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [errorsOpen, setErrorsOpen] = React.useState(false);

  const errors = React.useMemo(() => validateDeck(deck), [deck]);
  const errorCardIds = React.useMemo(() => collectErrorCardIds(errors), [errors]);

  function startEditingName() {
    setNameDraft(deck.name);
    setEditingName(true);
  }

  function commitNameEdit() {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== deck.name) updateDeck(deck.id, { name: trimmed });
    setEditingName(false);
  }

  function cancelNameEdit() {
    setNameDraft(deck.name);
    setEditingName(false);
  }

  React.useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  // One pass over deck.cards for all three header stats, recomputed only when
  // the cards change (was ~4 full passes on every render, e.g. opening the
  // card sheet).
  const { totalCards, landCount, avgCmc } = React.useMemo(() => {
    let total = 0;
    let lands = 0;
    let nonLandCmc = 0;
    let nonLandCount = 0;
    for (const c of deck.cards) {
      total += c.quantity;
      const isLandCard = c.typeLine?.includes('Land') || c.category === 'Terrenos';
      if (isLandCard) {
        lands += c.quantity;
      }
      if (!c.typeLine?.includes('Land')) {
        nonLandCmc += c.cmc * c.quantity;
        nonLandCount += c.quantity;
      }
    }
    return {
      totalCards: total,
      landCount: lands,
      avgCmc: deck.cards.length > 0 ? (nonLandCmc / Math.max(nonLandCount, 1)).toFixed(2) : '0.00',
    };
  }, [deck.cards]);

  const sortedCategories = React.useMemo(
    () => materializeCategories(deck),
    [deck.cards, deck.categories]
  );

  const grouped = React.useMemo(() => groupCardsByCategory(deck.cards), [deck.cards]);

  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (forcedExpandAll === undefined) return;
    setExpandedSections(() => {
      const next: Record<string, boolean> = {};
      for (const cat of sortedCategories) next[cat] = forcedExpandAll;
      return next;
    });
    // Intentionally depends ONLY on forcedExpandAll: this should fire when the
    // user hits expand/collapse-all, NOT on every card mutation (sortedCategories
    // is a fresh array each mutation, which was wiping manual per-section
    // toggles). New categories default to expanded via expandedSections[cat] !== false.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedExpandAll]);

  const toggleSection = React.useCallback((cat: string) => {
    setExpandedSections((prev) => ({ ...prev, [cat]: prev[cat] === false ? true : false }));
  }, []);

  const handleCardClick = React.useCallback((card: DeckCard) => {
    setSelectedCard(card);
    setSheetOpen(true);
  }, []);

  // Quick add (basic lands only) / remove one copy, straight from the decklist.
  const handleQuickAdd = React.useCallback((card: DeckCard) => addCard(deck.id, card), [addCard, deck.id]);
  const handleQuickRemove = React.useCallback((card: DeckCard) => removeCard(deck.id, card.scryfallId), [removeCard, deck.id]);

  if (deck.cards.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--surface-1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          🃏
        </div>
        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
            Deck vazio
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Adicione cartas pelo campo de busca abaixo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Deck title */}
      <div style={{ marginBottom: '16px' }}>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitNameEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') cancelNameEdit();
            }}
            maxLength={60}
            style={{
              display: 'block',
              width: '100%',
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              margin: '0 0 4px',
              padding: 0,
              border: 'none',
              borderBottom: '2px solid var(--accent)',
              backgroundColor: 'transparent',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <h1
            onClick={startEditingName}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              margin: '0 0 4px',
              cursor: 'pointer',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {deck.name}
            </span>
            <Pencil size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </h1>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ManaGroup colors={(deck.colorIdentity ?? []).length > 0 ? deck.colorIdentity : ['C']} size="sm" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totalCards} cartas</span>
          {errors.length > 0 && (
            <button
              onClick={() => setErrorsOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px 2px 6px',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                border: '1px solid rgba(248, 113, 113, 0.25)',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                color: 'var(--error)',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <XCircle size={12} />
              {errors.length} {errors.length === 1 ? 'erro' : 'erros'}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {([
              { mode: '1col' as ViewMode, icon: <Square size={13} /> },
              { mode: '2col' as ViewMode, icon: <LayoutGrid size={13} /> },
              { mode: 'list' as ViewMode, icon: <LayoutList size={13} /> },
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
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          padding: '10px 12px',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <StatItem icon={<Layers size={13} />} label="Cartas" value={totalCards} />
        <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)' }} />
        <StatItem icon={<MapPin size={13} />} label="Terrenos" value={landCount} />
        <div style={{ width: '1px', backgroundColor: 'var(--border-subtle)' }} />
        <StatItem icon={<Zap size={13} />} label="CMC médio" value={avgCmc} />
      </div>

      {/* Cards by category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedCategories.map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            cards={grouped[cat] ?? []}
            expanded={expandedSections[cat] !== false}
            onToggle={toggleSection}
            onCardClick={handleCardClick}
            onQuickAdd={handleQuickAdd}
            onQuickRemove={handleQuickRemove}
            viewMode={viewMode}
            errorCardIds={errorCardIds}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            selectionMode={selectionMode}
            onManageSections={onManageSections}
          />
        ))}
      </div>

      {/* Card detail bottom sheet */}
      <CardBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        card={selectedCard ? deckCardToScryfall(selectedCard) : null}
        deckId={deck.id}
        existingCard={
          selectedCard
            ? deck.cards.find((c) => c.scryfallId === selectedCard.scryfallId) ?? null
            : null
        }
        deck={deck}
      />

      {/* Deck validation errors */}
      <DeckErrorsSheet
        isOpen={errorsOpen}
        onClose={() => setErrorsOpen(false)}
        errors={errors}
      />
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
        {icon}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
      </span>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}
