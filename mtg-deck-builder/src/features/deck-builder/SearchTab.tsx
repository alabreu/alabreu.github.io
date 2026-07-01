import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Minus, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Input } from '../../design-system/components/Input';
import { Button } from '../../design-system/components/Button';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { ManaSymbol } from '../../design-system/components/ManaSymbol';
import { SkeletonCard } from '../../design-system/components/Skeleton';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { ScryfallCard, ManaColor, Deck } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';

const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

interface SearchTabProps {
  deck: Deck;
}

async function searchScryfall(query: string): Promise<ScryfallCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name&unique=cards`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Scryfall API error: ${res.status}`);
  }
  const data = await res.json();
  return data.data as ScryfallCard[];
}

function buildQuery(
  text: string,
  colors: ManaColor[],
  type: string,
  cmcMin: number | null,
  cmcMax: number | null
): string {
  const parts: string[] = [];

  if (text.trim()) {
    parts.push(text.trim());
  }

  if (colors.length > 0) {
    const colorStr = colors.join('');
    parts.push(`id<=${colorStr}`);
  }

  if (type.trim()) {
    parts.push(`t:${type.trim()}`);
  }

  if (cmcMin !== null) parts.push(`cmc>=${cmcMin}`);
  if (cmcMax !== null) parts.push(`cmc<=${cmcMax}`);

  // Always limit to commander-legal by default if we have a commander identity
  if (parts.length === 0) return 'f:commander';

  return parts.join(' ');
}

export function SearchTab({ deck }: SearchTabProps) {
  const { addCard, removeCard } = useDeckStore();

  const [searchText, setSearchText] = React.useState('');
  const [selectedColors, setSelectedColors] = React.useState<ManaColor[]>([]);
  const [typeFilter, setTypeFilter] = React.useState('');
  const [cmcMin, setCmcMin] = React.useState('');
  const [cmcMax, setCmcMax] = React.useState('');
  const [results, setResults] = React.useState<ScryfallCard[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [selectedCard, setSelectedCard] = React.useState<ScryfallCard | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const deckCardMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of deck.cards) map[c.scryfallId] = c.quantity;
    return map;
  }, [deck.cards]);

  function triggerSearch(
    text: string,
    colors: ManaColor[],
    type: string,
    min: string,
    max: string
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const query = buildQuery(
        text,
        colors,
        type,
        min !== '' ? Number(min) : null,
        max !== '' ? Number(max) : null
      );
      setIsLoading(true);
      setError(null);
      try {
        const data = await searchScryfall(query);
        setResults(data);
        setHasSearched(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao buscar cartas');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchText(val);
    triggerSearch(val, selectedColors, typeFilter, cmcMin, cmcMax);
  }

  function toggleColor(color: ManaColor) {
    const next = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    setSelectedColors(next);
    triggerSearch(searchText, next, typeFilter, cmcMin, cmcMax);
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTypeFilter(val);
    triggerSearch(searchText, selectedColors, val, cmcMin, cmcMax);
  }

  function handleQuickAdd(card: ScryfallCard, e: React.MouseEvent) {
    e.stopPropagation();
    const imageUrl =
      card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
    const artCropUrl =
      card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop || null;
    const backImageUrl = card.card_faces?.[1]?.image_uris?.normal ?? null;

    let category = 'Outros';
    if (card.type_line?.includes('Land')) category = 'Terrenos';

    addCard(deck.id, {
      scryfallId: card.id,
      name: card.name,
      quantity: 1,
      category,
      imageUrl,
      artCropUrl,
      backImageUrl,
      manaCost: card.mana_cost,
      typeLine: card.type_line,
      cmc: card.cmc,
    });
  }

  function handleQuickRemove(card: ScryfallCard, e: React.MouseEvent) {
    e.stopPropagation();
    removeCard(deck.id, card.id);
  }

  function handleCardClick(card: ScryfallCard) {
    setSelectedCard(card);
    setSheetOpen(true);
  }

  const hasActiveFilters = selectedColors.length > 0 || !!typeFilter || !!cmcMin || !!cmcMax;

  function clearFilters() {
    setSelectedColors([]);
    setTypeFilter('');
    setCmcMin('');
    setCmcMax('');
    triggerSearch(searchText, [], '', '', '');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search bar */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Buscar por nome, texto..."
            value={searchText}
            onChange={handleTextChange}
            leftIcon={<Search size={15} />}
            rightIcon={
              searchText ? (
                <button
                  onClick={() => {
                    setSearchText('');
                    triggerSearch('', selectedColors, typeFilter, cmcMin, cmcMax);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0 }}
                >
                  <X size={14} />
                </button>
              ) : undefined
            }
            fullWidth
          />
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterSheetOpen(true)}
          style={{
            position: 'relative',
            width: '38px',
            height: '38px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hasActiveFilters ? 'var(--accent-subtle)' : 'var(--surface-1)',
            border: `1px solid ${hasActiveFilters ? 'var(--accent-border)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: hasActiveFilters ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <SlidersHorizontal size={16} />
          {hasActiveFilters && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                border: '1.5px solid var(--bg-elevated)',
              }}
            />
          )}
        </button>
      </div>

      {/* Filter bottom sheet */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Filtros"
      >
        <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Color filter */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              Identidade de cor
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {MANA_COLORS.map((color) => {
                const active = selectedColors.includes(color);
                return (
                  <button
                    key={color}
                    onClick={() => toggleColor(color)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      opacity: active ? 1 : 0.3,
                      transform: active ? 'scale(1.15)' : 'scale(1)',
                      transition: 'opacity 0.15s, transform 0.15s',
                      outline: active ? '2px solid var(--accent)' : 'none',
                      outlineOffset: '3px',
                      borderRadius: '50%',
                    }}
                  >
                    <ManaSymbol color={color} size="lg" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Tipo
            </p>
            <Input
              placeholder="Ex: Creature, Instant, Land..."
              value={typeFilter}
              onChange={handleTypeChange}
              fullWidth
            />
          </div>

          {/* CMC filter */}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              CMC (custo convertido de mana)
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Input
                placeholder="Mínimo"
                value={cmcMin}
                onChange={(e) => {
                  setCmcMin(e.target.value);
                  triggerSearch(searchText, selectedColors, typeFilter, e.target.value, cmcMax);
                }}
                type="number"
                min={0}
                fullWidth
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', flexShrink: 0 }}>—</span>
              <Input
                placeholder="Máximo"
                value={cmcMax}
                onChange={(e) => {
                  setCmcMax(e.target.value);
                  triggerSearch(searchText, selectedColors, typeFilter, cmcMin, e.target.value);
                }}
                type="number"
                min={0}
                fullWidth
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {hasActiveFilters && (
              <Button variant="secondary" size="md" fullWidth onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
            <Button variant="primary" size="md" fullWidth onClick={() => setFilterSheetOpen(false)}>
              Aplicar
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 12px' }}>
        {isLoading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={32} style={{ color: 'var(--error)' }} />
            <p style={{ color: 'var(--error)', fontSize: '14px' }}>{error}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              Tente usar termos de busca diferentes
            </p>
          </div>
        )}

        {!isLoading && !error && hasSearched && results.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <Search size={32} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              Nenhuma carta encontrada
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Tente outros termos de busca
            </p>
          </div>
        )}

        {!isLoading && !hasSearched && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              Busque cartas para seu deck
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Use o campo acima para encontrar cartas. Filtre por cores, tipo ou custo.
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {results.map((card, i) => {
              const qty = deckCardMap[card.id] ?? 0;
              const imageUrl =
                card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}
                >
                  <div style={{ position: 'relative' }}>
                    <CardImage
                      imageUrl={imageUrl}
                      name={card.name}
                      size="normal"
                      onClick={() => handleCardClick(card)}
                      showQuantityBadge={qty > 0 ? qty : undefined}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingBottom: '2px' }}>
                    <span
                      style={{
                        flex: 1,
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {card.name}
                    </span>
                    <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                      {qty > 0 && (
                        <button
                          onClick={(e) => handleQuickRemove(card, e)}
                          style={{
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(248,113,113,0.12)',
                            border: '1px solid rgba(248,113,113,0.25)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            color: 'var(--error)',
                          }}
                        >
                          <Minus size={11} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleQuickAdd(card, e)}
                        style={{
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--accent-subtle)',
                          border: '1px solid var(--accent-border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          color: 'var(--accent)',
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Card detail bottom sheet */}
      <CardBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        card={selectedCard}
        deckId={deck.id}
        existingCard={
          selectedCard
            ? deck.cards.find((c) => c.scryfallId === selectedCard.id) ?? null
            : null
        }
      />
    </div>
  );
}
