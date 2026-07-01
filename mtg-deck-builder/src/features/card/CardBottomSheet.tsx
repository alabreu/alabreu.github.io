import React from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { ManaSymbol } from '../../design-system/components/ManaSymbol';
import { CardImage } from './CardImage';
import { DeckCard, ScryfallCard, DEFAULT_CATEGORIES, ManaColor } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';
import { Crown, Trash2, Plus, ChevronDown, RefreshCw } from 'lucide-react';

interface CardBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  card: ScryfallCard | null;
  deckId: string;
  existingCard?: DeckCard | null;
}

function parseManaSymbols(manaCost: string | null): ManaColor[] {
  if (!manaCost) return [];
  const matches = manaCost.match(/\{([WUBRG])\}/g) || [];
  return matches.map((m) => m[1] as ManaColor);
}

function isLegendaryCreatureOrPlaneswalker(typeLine: string): boolean {
  return (
    (typeLine.includes('Legendary') && typeLine.includes('Creature')) ||
    typeLine.includes('Planeswalker')
  );
}

function getRarityColor(rarity: string): string {
  switch (rarity.toLowerCase()) {
    case 'mythic':
      return '#f97316';
    case 'rare':
      return '#c9a84c';
    case 'uncommon':
      return '#94a3b8';
    default:
      return 'var(--text-muted)';
  }
}

export function CardBottomSheet({
  isOpen,
  onClose,
  card,
  deckId,
  existingCard,
}: CardBottomSheetProps) {
  const { addCard, removeCard, setCommander, updateCardCategory } = useDeckStore();
  const [selectedCategory, setSelectedCategory] = React.useState('Outros');
  const [flipped, setFlipped] = React.useState(false);

  React.useEffect(() => {
    setFlipped(false);
    if (existingCard) {
      setSelectedCategory(existingCard.category);
    } else if (card) {
      if (card.type_line?.includes('Land')) {
        setSelectedCategory('Terrenos');
      } else {
        setSelectedCategory('Outros');
      }
    }
  }, [card, existingCard]);

  if (!card) return null;

  const imageUrl =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;

  const artCropUrl =
    card.image_uris?.art_crop ||
    card.card_faces?.[0]?.image_uris?.art_crop ||
    null;

  const isDfc = card.name.includes(' // ') || Boolean(existingCard?.backImageUrl);
  const backImageUrl =
    existingCard?.backImageUrl ||
    card.card_faces?.[1]?.image_uris?.normal ||
    (isDfc ? `https://cards.scryfall.io/normal/back/${card.id[0]}/${card.id[1]}/${card.id}.jpg` : null);

  const isInDeck = !!existingCard;
  const quantity = existingCard?.quantity ?? 0;
  const canBeCommander = isLegendaryCreatureOrPlaneswalker(card.type_line ?? '');
  const manaColors = parseManaSymbols(card.mana_cost);

  function toDeckCard(): DeckCard {
    return {
      scryfallId: card!.id,
      name: card!.name,
      quantity: 1,
      category: selectedCategory,
      imageUrl,
      artCropUrl,
      manaCost: card!.mana_cost,
      typeLine: card!.type_line,
      cmc: card!.cmc,
    };
  }

  function handleAdd() {
    addCard(deckId, { ...toDeckCard(), category: selectedCategory });
  }

  function handleRemove() {
    removeCard(deckId, card!.id);
    if (quantity <= 1) onClose();
  }

  function handleSetCommander() {
    setCommander(deckId, { ...toDeckCard(), category: 'Comandante' });
    onClose();
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const cat = e.target.value;
    setSelectedCategory(cat);
    if (isInDeck) {
      updateCardCategory(deckId, card!.id, cat);
    }
  }

  const oracleText =
    card.oracle_text ||
    card.card_faces?.map((f) => f.oracle_text).join('\n---\n') ||
    null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={card.name} maxHeight="92vh">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Card image with DFC flip */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ maxWidth: '220px', width: '100%', perspective: '900px' }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              style={{ position: 'relative', transformStyle: 'preserve-3d' }}
            >
              {/* Front face */}
              <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                <CardImage imageUrl={imageUrl} name={card.name} size="normal" />
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
                  <CardImage imageUrl={backImageUrl!} name={card.name} size="normal" />
                </div>
              )}
            </motion.div>
          </div>

          {isDfc && (
            <button
              onClick={() => setFlipped((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '5px 12px 5px 10px',
                borderRadius: '999px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '12px',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <motion.div
                animate={{ rotate: flipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
                style={{ display: 'flex' }}
              >
                <RefreshCw size={11} />
              </motion.div>
              Transformar
            </button>
          )}
        </div>

        {/* Card details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Mana cost + type */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Tipo
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {card.type_line}
              </span>
            </div>
            {manaColors.length > 0 && (
              <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                {manaColors.map((c, i) => (
                  <ManaSymbol key={i} color={c} size="md" />
                ))}
              </div>
            )}
          </div>

          {/* Mana cost text + CMC */}
          {card.mana_cost && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Custo
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  {card.mana_cost}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  CMC
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {card.cmc}
                </span>
              </div>
              {(card.power || card.toughness) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    P/T
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {card.power}/{card.toughness}
                  </span>
                </div>
              )}
              {card.loyalty && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Lealdade
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {card.loyalty}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Oracle text */}
          {oracleText && (
            <div
              style={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {oracleText}
              </p>
            </div>
          )}

          {/* Set + rarity */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Badge variant="default" size="sm">
              {card.set_name}
            </Badge>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: getRarityColor(card.rarity),
                textTransform: 'capitalize',
              }}
            >
              {card.rarity}
            </span>
          </div>

          {/* Legality */}
          {card.legalities.commander !== 'legal' && (
            <Badge variant="error" size="sm">
              Não permitido no Commander
            </Badge>
          )}
        </div>

        {/* Category selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
            }}
          >
            Categoria
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCategory}
              onChange={handleCategoryChange}
              style={{
                width: '100%',
                height: '38px',
                backgroundColor: 'var(--surface-1)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0 36px 0 12px',
                fontSize: '16px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                outline: 'none',
              }}
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
          {canBeCommander && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Crown size={15} />}
              onClick={handleSetCommander}
            >
              Definir como Comandante
            </Button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<Plus size={15} />}
              onClick={handleAdd}
            >
              {isInDeck ? `Adicionar (${quantity}x)` : 'Adicionar ao Deck'}
            </Button>

            {isInDeck && (
              <Button
                variant="danger"
                size="md"
                leftIcon={<Trash2 size={15} />}
                onClick={handleRemove}
                style={{ flexShrink: 0 }}
              >
                {quantity > 1 ? `${quantity}x` : 'Remover'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
