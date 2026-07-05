import React from 'react';
import { motion } from 'framer-motion';
import { Search, X, Plus, Minus, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Input } from '../../design-system/components/Input';
import { Button } from '../../design-system/components/Button';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { ManaSymbol } from '../../design-system/components/ManaSymbol';
import { SkeletonCard } from '../../design-system/components/Skeleton';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { ScryfallCard, ManaColor, Deck, DeckCard } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';
import {
  SearchFilters,
  EMPTY_FILTERS,
  ColorMode,
  buildScryfallQuery,
  hasActiveFilters,
} from './scryfallQuery';

const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

interface SearchTabProps {
  deck: Deck;
}

async function searchScryfall(query: string): Promise<ScryfallCard[]> {
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=edhrec&unique=cards`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Scryfall API error: ${res.status}`);
  }
  const data = await res.json();
  return data.data as ScryfallCard[];
}

/** Re-rank so exact name matches come first, then prefix matches, then the rest
 *  (which keep the API's EDHREC-popularity order). */
function rankResults(cards: ScryfallCard[], text: string): ScryfallCard[] {
  const q = text.trim().toLowerCase();
  if (!q) return cards;
  const score = (c: ScryfallCard) => {
    const name = c.name.toLowerCase();
    const front = name.split(' // ')[0];
    if (name === q || front === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    return 3;
  };
  return cards
    .map((c, i) => ({ c, s: score(c), i }))
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.c);
}

/* ---------- Filter sheet building blocks ---------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
      {children}
    </p>
  );
}

function ManaChips({
  selected,
  onToggle,
}: {
  selected: ManaColor[];
  onToggle: (c: ManaColor) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      {MANA_COLORS.map((color) => {
        const active = selected.includes(color);
        return (
          <button
            key={color}
            onClick={() => onToggle(color)}
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
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ManaSymbol color={color} size="lg" />
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '7px 4px',
            fontSize: '12px',
            fontWeight: 500,
            fontFamily: 'inherit',
            backgroundColor: value === opt.value ? 'var(--surface-2)' : 'transparent',
            color: value === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
            border: 'none',
            borderLeft: i > 0 ? '1px solid var(--border-default)' : 'none',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ChipRow({
  options,
  selected,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            style={{
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'inherit',
              borderRadius: '999px',
              backgroundColor: active ? 'var(--accent-subtle)' : 'var(--surface-1)',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-default)'}`,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Two side-by-side inputs that never overflow the row. */
function MinMaxRow({
  minValue,
  maxValue,
  onMin,
  onMax,
}: {
  minValue: string;
  maxValue: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Input placeholder="Mínimo" value={minValue} onChange={(e) => onMin(e.target.value)} type="number" min={0} fullWidth />
      </div>
      <span style={{ color: 'var(--text-muted)', fontSize: '14px', flexShrink: 0 }}>—</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Input placeholder="Máximo" value={maxValue} onChange={(e) => onMax(e.target.value)} type="number" min={0} fullWidth />
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export function SearchTab({ deck }: SearchTabProps) {
  const { addCard, removeCard } = useDeckStore();

  const [searchText, setSearchText] = React.useState('');
  const [filters, setFilters] = React.useState<SearchFilters>(EMPTY_FILTERS);
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

  function triggerSearch(text: string, f: SearchFilters) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Nothing typed and no filters touched: reset instead of searching everything
    if (!text.trim() && !hasActiveFilters(f)) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const query = buildScryfallQuery(text, f);
      setIsLoading(true);
      setError(null);
      try {
        const data = await searchScryfall(query);
        setResults(rankResults(data, text));
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
    triggerSearch(val, filters);
  }

  function updateFilters(patch: Partial<SearchFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    triggerSearch(searchText, next);
  }

  function toggleIn<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  const validColors = ['W', 'U', 'B', 'R', 'G', 'C'];

  function scryfallToDeckCard(card: ScryfallCard, category: string): DeckCard {
    const imageUrl =
      card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
    const artCropUrl =
      card.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.art_crop || null;
    const backImageUrl = card.card_faces?.[1]?.image_uris?.normal ?? null;
    return {
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
      colorIdentity: (card.color_identity ?? []).filter(
        (c): c is ManaColor => validColors.includes(c)
      ),
      keywords: card.keywords ?? [],
    };
  }

  function handleQuickAdd(card: ScryfallCard, e: React.MouseEvent) {
    e.stopPropagation();
    const category = card.type_line?.includes('Land') ? 'Terrenos' : 'Outros';
    addCard(deck.id, scryfallToDeckCard(card, category));
  }

  function handleQuickRemove(card: ScryfallCard, e: React.MouseEvent) {
    e.stopPropagation();
    removeCard(deck.id, card.id);
  }

  function handleCardClick(card: ScryfallCard) {
    setSelectedCard(card);
    setSheetOpen(true);
  }

  const filtersActive = hasActiveFilters(filters);

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    triggerSearch(searchText, EMPTY_FILTERS);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search bar */}
      <div
        style={{
          padding: '12px 16px 4px',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Input
            placeholder="Nome ou sintaxe Scryfall..."
            value={searchText}
            onChange={handleTextChange}
            leftIcon={<Search size={15} />}
            rightIcon={
              searchText ? (
                <button
                  onClick={() => {
                    setSearchText('');
                    triggerSearch('', filters);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--text-muted)', padding: 0, pointerEvents: 'auto' }}
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
            backgroundColor: filtersActive ? 'var(--accent-subtle)' : 'var(--surface-1)',
            border: `1px solid ${filtersActive ? 'var(--accent-border)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            color: filtersActive ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <SlidersHorizontal size={16} />
          {filtersActive && (
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

      {/* Syntax hint */}
      <p style={{ padding: '0 16px 8px', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
        Suporta sintaxe Scryfall: <span style={{ fontFamily: 'monospace' }}>t:dragon o:"draw a card" mv&lt;=3 is:commander</span>
      </p>

      {/* Advanced filters bottom sheet */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Busca avançada"
        maxHeight="88vh"
      >
        <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowX: 'hidden' }}>
          {/* Oracle text */}
          <div>
            <SectionLabel>Texto da carta</SectionLabel>
            <Input
              placeholder='Ex: draw "a card"'
              value={filters.oracle}
              onChange={(e) => updateFilters({ oracle: e.target.value })}
              fullWidth
            />
          </div>

          {/* Type line */}
          <div>
            <SectionLabel>Tipo</SectionLabel>
            <Input
              placeholder="Ex: creature dragon"
              value={filters.types}
              onChange={(e) => updateFilters({ types: e.target.value })}
              fullWidth
            />
          </div>

          {/* Colors */}
          <div>
            <SectionLabel>Cores</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ManaChips
                selected={filters.colors}
                onToggle={(c) => updateFilters({ colors: toggleIn(filters.colors, c) })}
              />
              {filters.colors.length > 0 && (
                <Segmented<ColorMode>
                  options={[
                    { value: 'include', label: 'Contém' },
                    { value: 'exact', label: 'Exatamente' },
                    { value: 'atmost', label: 'No máximo' },
                  ]}
                  value={filters.colorMode}
                  onChange={(v) => updateFilters({ colorMode: v })}
                />
              )}
            </div>
          </div>

          {/* Commander color identity */}
          <div>
            <SectionLabel>Identidade de comandante</SectionLabel>
            <ManaChips
              selected={filters.identity}
              onToggle={(c) => updateFilters({ identity: toggleIn(filters.identity, c) })}
            />
          </div>

          {/* Mana value */}
          <div>
            <SectionLabel>Valor de mana (CMC)</SectionLabel>
            <MinMaxRow
              minValue={filters.mvMin}
              maxValue={filters.mvMax}
              onMin={(v) => updateFilters({ mvMin: v })}
              onMax={(v) => updateFilters({ mvMax: v })}
            />
          </div>

          {/* Power / Toughness */}
          <div>
            <SectionLabel>Poder</SectionLabel>
            <MinMaxRow
              minValue={filters.powMin}
              maxValue={filters.powMax}
              onMin={(v) => updateFilters({ powMin: v })}
              onMax={(v) => updateFilters({ powMax: v })}
            />
          </div>
          <div>
            <SectionLabel>Resistência</SectionLabel>
            <MinMaxRow
              minValue={filters.touMin}
              maxValue={filters.touMax}
              onMin={(v) => updateFilters({ touMin: v })}
              onMax={(v) => updateFilters({ touMax: v })}
            />
          </div>

          {/* Rarity */}
          <div>
            <SectionLabel>Raridade</SectionLabel>
            <ChipRow
              options={[
                { value: 'c', label: 'Comum' },
                { value: 'u', label: 'Incomum' },
                { value: 'r', label: 'Rara' },
                { value: 'm', label: 'Mítica' },
              ]}
              selected={filters.rarities}
              onToggle={(v) => updateFilters({ rarities: toggleIn(filters.rarities, v) })}
            />
          </div>

          {/* Set */}
          <div>
            <SectionLabel>Coleção</SectionLabel>
            <Input
              placeholder="Código do set, ex: tdc"
              value={filters.set}
              onChange={(e) => updateFilters({ set: e.target.value })}
              fullWidth
            />
          </div>

          {/* Commander legality toggle */}
          <button
            onClick={() => updateFilters({ commanderLegal: !filters.commanderLegal })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
              Somente cartas legais em Commander
            </span>
            <span
              style={{
                width: '40px',
                height: '24px',
                borderRadius: '999px',
                flexShrink: 0,
                backgroundColor: filters.commanderLegal ? 'var(--accent)' : 'var(--surface-3)',
                position: 'relative',
                transition: 'background-color 0.15s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: filters.commanderLegal ? '19px' : '3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.15s',
                }}
              />
            </span>
          </button>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {filtersActive && (
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
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px 12px' }}>
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
              Verifique a sintaxe da busca ou tente termos diferentes
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
              Tente outros termos ou ajuste os filtros
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
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>
              Pesquise por nome ou use a sintaxe do Scryfall — ex:{' '}
              <span style={{ fontFamily: 'monospace' }}>t:instant id&lt;=wub mv&lt;=2</span>.
              Toque no ícone de filtros para a busca avançada.
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
                        minWidth: 0,
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
        deck={deck}
      />
    </div>
  );
}
