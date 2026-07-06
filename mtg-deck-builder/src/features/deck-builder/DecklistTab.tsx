import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Layers, MapPin, Zap, Search, RefreshCw, LayoutGrid, LayoutList, Square } from 'lucide-react';

type ViewMode = '2col' | '1col' | 'list';
import { Deck, DeckCard, ScryfallCard } from '../../types';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { ManaGroup } from '../../design-system/components/ManaSymbol';
import { useNavigate } from 'react-router-dom';
import { materializeCategories } from '../../store/useDeckStore';

interface DecklistTabProps {
  deck: Deck;
  forcedExpandAll?: boolean;
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

const FlippableCard = React.memo(function FlippableCard({
  card,
  onCardClick,
}: {
  card: DeckCard;
  onCardClick: (card: DeckCard) => void;
}) {
  const [flipped, setFlipped] = React.useState(false);
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
          <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <CardImage
              imageUrl={card.imageUrl}
              name={card.name}
              size="normal"
              onClick={() => onCardClick(card)}
              showQuantityBadge={card.quantity > 1 ? card.quantity : undefined}
            />
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

const ListCardRow = React.memo(function ListCardRow({ card, onCardClick }: { card: DeckCard; onCardClick: (card: DeckCard) => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => onCardClick(card)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 4px',
        width: '100%',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{ width: '36px', flexShrink: 0, borderRadius: '3px', overflow: 'hidden' }}>
        <CardImage imageUrl={card.imageUrl} name={card.name} size="small" />
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
      {card.quantity > 1 && (
        <Badge variant="default" size="sm">{card.quantity}</Badge>
      )}
    </motion.button>
  );
});

interface CategorySectionProps {
  category: string;
  cards: DeckCard[];
  expanded: boolean;
  onToggle: (category: string) => void;
  onCardClick: (card: DeckCard) => void;
  viewMode: ViewMode;
}

const CategorySection = React.memo(function CategorySection({ category, cards, expanded, onToggle, onCardClick, viewMode }: CategorySectionProps) {
  const totalQty = cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <div style={{ marginBottom: '4px' }}>
      <button
        onClick={() => onToggle(category)}
        style={{
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

export function DecklistTab({ deck, forcedExpandAll }: DecklistTabProps) {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = React.useState<DeckCard | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = React.useState<ViewMode>('2col');

  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);
  const landCount = deck.cards
    .filter((c) => c.typeLine?.includes('Land') || c.category === 'Terrenos')
    .reduce((s, c) => s + c.quantity, 0);
  const avgCmc =
    deck.cards.length > 0
      ? (
          deck.cards
            .filter((c) => !c.typeLine?.includes('Land'))
            .reduce((s, c) => s + c.cmc * c.quantity, 0) /
          Math.max(
            deck.cards
              .filter((c) => !c.typeLine?.includes('Land'))
              .reduce((s, c) => s + c.quantity, 0),
            1
          )
        ).toFixed(2)
      : '0.00';

  const sortedCategories = React.useMemo(
    () => materializeCategories(deck),
    [deck.cards, deck.categories]
  );

  const grouped = React.useMemo(() => groupCardsByCategory(deck.cards), [deck.cards]);

  const allExpanded = sortedCategories.every((c) => expandedSections[c] !== false);

  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (forcedExpandAll === undefined) return;
    setExpandedSections(() => {
      const next: Record<string, boolean> = {};
      for (const cat of sortedCategories) next[cat] = forcedExpandAll;
      return next;
    });
  }, [forcedExpandAll, sortedCategories]);

  const toggleSection = React.useCallback((cat: string) => {
    setExpandedSections((prev) => ({ ...prev, [cat]: prev[cat] === false ? true : false }));
  }, []);

  const handleCardClick = React.useCallback((card: DeckCard) => {
    setSelectedCard(card);
    setSheetOpen(true);
  }, []);

  if (deck.cards.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '60px 24px',
          textAlign: 'center',
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
            Adicione cartas pela aba de Busca
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Search size={15} />}
          onClick={() => navigate(`/deck/${deck.id}?tab=1`)}
        >
          Buscar Cartas
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px' }}>
      {/* Deck title */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
          {deck.name}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ManaGroup colors={(deck.colorIdentity ?? []).length > 0 ? deck.colorIdentity : ['C']} size="sm" />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totalCards} cartas</span>
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
            viewMode={viewMode}
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
