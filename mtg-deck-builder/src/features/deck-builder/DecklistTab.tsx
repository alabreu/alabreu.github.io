import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Layers, MapPin, Zap, Search, RefreshCw } from 'lucide-react';
import { Deck, DeckCard, ScryfallCard } from '../../types';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { Badge } from '../../design-system/components/Badge';
import { Button } from '../../design-system/components/Button';
import { useNavigate } from 'react-router-dom';

interface DecklistTabProps {
  deck: Deck;
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
    color_identity: [],
    power: null,
    toughness: null,
    loyalty: null,
    rarity: 'common',
    set_name: '',
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

function dfcBackUrl(id: string): string {
  return `https://cards.scryfall.io/normal/back/${id[0]}/${id[1]}/${id}.jpg`;
}

function FlippableCard({
  card,
  onCardClick,
}: {
  card: DeckCard;
  onCardClick: (card: DeckCard) => void;
}) {
  const [flipped, setFlipped] = React.useState(false);
  const isDfc = card.name.includes(' // ');
  const backImageUrl = card.backImageUrl || (isDfc ? dfcBackUrl(card.scryfallId) : null);

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
}

interface CategorySectionProps {
  category: string;
  cards: DeckCard[];
  deckId: string;
  onCardClick: (card: DeckCard) => void;
}

function CategorySection({ category, cards, onCardClick }: CategorySectionProps) {
  const [expanded, setExpanded] = React.useState(true);
  const totalQty = cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <div style={{ marginBottom: '4px' }}>
      {/* Category header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: '0.01em',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span style={{ flex: 1 }}>{category}</span>
        <Badge variant="default" size="sm">
          {totalQty}
        </Badge>
      </button>

      {/* Cards grid */}
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DecklistTab({ deck }: DecklistTabProps) {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = React.useState<DeckCard | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

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

  const grouped = groupCardsByCategory(deck.cards);
  const categoryOrder = [
    'Comandante',
    'Terrenos',
    'Ramp',
    'Compra de Cartas',
    'Remoção',
    'Proteção',
    'Wincons',
    'Outros',
  ];
  const sortedCategories = [
    ...categoryOrder.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !categoryOrder.includes(c)),
  ];

  function handleCardClick(card: DeckCard) {
    setSelectedCard(card);
    setSheetOpen(true);
  }

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
            cards={grouped[cat]}
            deckId={deck.id}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Card detail bottom sheet */}
      <CardBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        card={selectedCard ? deckCardToScryfall(selectedCard) : null}
        deckId={deck.id}
        existingCard={selectedCard}
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
