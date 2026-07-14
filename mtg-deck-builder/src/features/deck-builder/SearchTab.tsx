import React from 'react';
import { motion } from 'framer-motion';
import { Search, X, AlertCircle, SlidersHorizontal, CircleHelp, History, Square, LayoutGrid } from 'lucide-react';
import { Input } from '../../design-system/components/Input';
import { Button } from '../../design-system/components/Button';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { ManaSymbol } from '../../design-system/components/ManaSymbol';
import { SkeletonCard } from '../../design-system/components/Skeleton';
import { CardImage } from '../card/CardImage';
import { CardBottomSheet } from '../card/CardBottomSheet';
import { SyntaxHelpSheet } from './SyntaxHelpSheet';
import { ScryfallCard, ManaColor, Deck } from '../../types';
import { useDeckStore } from '../../store/useDeckStore';
import { scryfallToDeckCard, defaultCategoryFor } from '../card/cardUtils';
import { CardActionsOverlay } from '../card/CardActionsOverlay';
import { getUsdBrlRate } from '../../lib/usdBrl';
import { getPriceSource, getCardPriceLink } from '../../lib/priceSource';
import { validateDeck, collectErrorCardIds } from './deckValidation';
import {
  SearchFilters,
  EMPTY_FILTERS,
  ColorMode,
  buildScryfallQuery,
  hasActiveFilters,
} from './scryfallQuery';

const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];

const RECENT_KEY = 'recent-searches';
const RECENT_MAX = 10;

function loadRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* storage full */
  }
}

interface SearchTabProps {
  deck: Deck;
  /** Pre-fills and immediately runs a search (e.g. from a Coach "ver N cartas
   *  na busca" link). `initialQueryVersion` should bump on every request so
   *  clicking the same suggestion twice in a row still re-triggers. */
  initialQuery?: string;
  initialQueryVersion?: number;
}

// Scryfall site parity: same ordering (name A–Z) and same page size (60),
// so a search started there can be resumed here on the same page
const PAGE_SIZE = 60;

type SearchPage = {
  cards: ScryfallCard[];
  nextPage: string | null;
  totalCards: number;
};

async function fetchScryfallPage(url: string): Promise<SearchPage> {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return { cards: [], nextPage: null, totalCards: 0 };
    throw new Error(`Scryfall API error: ${res.status}`);
  }
  const data = await res.json();
  return {
    cards: (data.data ?? []) as ScryfallCard[],
    nextPage: data.has_more && data.next_page ? String(data.next_page) : null,
    totalCards: typeof data.total_cards === 'number' ? data.total_cards : (data.data ?? []).length,
  };
}

function searchScryfall(query: string): Promise<SearchPage> {
  return fetchScryfallPage(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name&unique=cards`
  );
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

type ViewMode = '1col' | '2col';

function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        flexShrink: 0,
        height: '38px',
      }}
    >
      {([
        { mode: '1col' as ViewMode, icon: <Square size={14} /> },
        { mode: '2col' as ViewMode, icon: <LayoutGrid size={14} /> },
      ]).map(({ mode, icon }, i) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          aria-label={mode === '1col' ? 'Visualização em 1 coluna' : 'Visualização em 2 colunas'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '100%',
            backgroundColor: value === mode ? 'var(--surface-2)' : 'transparent',
            border: 'none',
            borderLeft: i > 0 ? '1px solid var(--border-default)' : 'none',
            cursor: 'pointer',
            color: value === mode ? 'var(--text-primary)' : 'var(--text-muted)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalCards,
  loadingMore,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalCards: number;
  loadingMore: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '8px 0',
      }}
    >
      <Button variant="secondary" size="sm" onClick={onPrev} disabled={page <= 1 || loadingMore}>
        ← Anterior
      </Button>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
        Página {page} de {totalPages}
        <br />
        {totalCards} cartas
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
        isLoading={loadingMore}
      >
        Próxima →
      </Button>
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

export function SearchTab({ deck, initialQuery, initialQueryVersion }: SearchTabProps) {
  const { addCard, removeCard } = useDeckStore();

  const [searchText, setSearchText] = React.useState('');
  const [filters, setFilters] = React.useState<SearchFilters>(EMPTY_FILTERS);
  const [results, setResults] = React.useState<ScryfallCard[]>([]);
  const [nextPageUrl, setNextPageUrl] = React.useState<string | null>(null);
  const [totalCards, setTotalCards] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [selectedCard, setSelectedCard] = React.useState<ScryfallCard | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [syntaxHelpOpen, setSyntaxHelpOpen] = React.useState(false);
  const [usdBrlRate, setUsdBrlRate] = React.useState<number | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>('2col');
  const [recent, setRecent] = React.useState<string[]>(loadRecent);
  const priceSource = React.useMemo(() => getPriceSource(), []);

  React.useEffect(() => {
    let cancelled = false;
    getUsdBrlRate().then((rate) => {
      if (!cancelled) setUsdBrlRate(rate);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!initialQuery) return;
    setSearchText(initialQuery);
    setFilters(EMPTY_FILTERS);
    triggerSearch(initialQuery, EMPTY_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQueryVersion]);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsScrollRef = React.useRef<HTMLDivElement>(null);
  // Monotonic id per search intent: any async result carrying an older id is
  // discarded, so slow responses can't overwrite newer ones
  const searchSeqRef = React.useRef(0);
  const loadingMoreRef = React.useRef(false);
  const [pageError, setPageError] = React.useState(false);

  const deckCardMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of deck.cards) map[c.scryfallId] = c.quantity;
    return map;
  }, [deck.cards]);

  const errorCardIds = React.useMemo(() => collectErrorCardIds(validateDeck(deck)), [deck]);

  function triggerSearch(text: string, f: SearchFilters) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Nothing typed and no filters touched: reset instead of searching everything
    if (!text.trim() && !hasActiveFilters(f)) {
      searchSeqRef.current++; // invalidate any in-flight response
      setResults([]);
      setNextPageUrl(null);
      setTotalCards(0);
      setPage(1);
      setHasSearched(false);
      setIsLoading(false);
      setError(null);
      setPageError(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const seq = ++searchSeqRef.current;
      const query = buildScryfallQuery(text, f);
      setIsLoading(true);
      setError(null);
      setPageError(false);
      try {
        const data = await searchScryfall(query);
        if (seq !== searchSeqRef.current) return; // a newer search superseded this one
        setResults(data.cards);
        setNextPageUrl(data.nextPage);
        setTotalCards(data.totalCards);
        setPage(1);
        setHasSearched(true);
        if (text.trim() && data.cards.length > 0) rememberSearch(text.trim());
      } catch (e) {
        if (seq !== searchSeqRef.current) return;
        setError(e instanceof Error ? e.message : 'Erro ao buscar cartas');
        setResults([]);
        setNextPageUrl(null);
        setTotalCards(0);
        setPage(1);
      } finally {
        if (seq === searchSeqRef.current) setIsLoading(false);
      }
    }, 300);
  }

  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE));
  const pageCards = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function goToPage(n: number) {
    if (n < 1 || n > totalPages || loadingMoreRef.current) return;
    const seq = searchSeqRef.current;
    // Fetch additional API pages (175 cards each) until the requested
    // display page (60 cards, same as scryfall.com) is covered
    const needed = Math.min(n * PAGE_SIZE, totalCards);
    if (results.length < needed && nextPageUrl) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setPageError(false);
      try {
        let acc = results;
        let next: string | null = nextPageUrl;
        let first = true;
        while (acc.length < needed && next) {
          // Scryfall asks for ~75-100ms between requests; space out the extra
          // page fetches when jumping deep so a burst doesn't draw a 429.
          if (!first) await new Promise((res) => setTimeout(res, 100));
          first = false;
          const r: SearchPage = await fetchScryfallPage(next);
          if (seq !== searchSeqRef.current) return; // search changed mid-pagination
          acc = [...acc, ...r.cards];
          next = r.nextPage;
        }
        setResults(acc);
        setNextPageUrl(next);
      } catch {
        if (seq === searchSeqRef.current) setPageError(true);
        return;
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
    if (seq !== searchSeqRef.current) return;
    setPage(n);
    resultsScrollRef.current?.scrollTo({ top: 0 });
  }

  function rememberSearch(term: string) {
    setRecent((prev) => {
      const tl = term.toLowerCase();
      // Consolidate partial typing: "dora" is replaced by "doran" and vice versa
      const next = [
        term,
        ...prev.filter((p) => {
          const pl = p.toLowerCase();
          return pl !== tl && !tl.startsWith(pl) && !pl.startsWith(tl);
        }),
      ].slice(0, RECENT_MAX);
      saveRecent(next);
      return next;
    });
  }

  function removeRecent(term: string) {
    setRecent((prev) => {
      const next = prev.filter((p) => p !== term);
      saveRecent(next);
      return next;
    });
  }

  function clearRecent() {
    setRecent([]);
    saveRecent([]);
  }

  function runRecent(term: string) {
    setSearchText(term);
    triggerSearch(term, filters);
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

  function handleQuickAdd(card: ScryfallCard, e: React.MouseEvent) {
    e.stopPropagation();
    addCard(deck.id, scryfallToDeckCard(card, defaultCategoryFor(card)));
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
          padding: '12px 16px',
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

        <ViewModeToggle value={viewMode} onChange={setViewMode} />

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

      {/* Advanced filters bottom sheet */}
      <BottomSheet
        isOpen={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        title="Busca avançada"
        maxHeight="88dvh"
        headerAction={
          <button
            onClick={() => setSyntaxHelpOpen(true)}
            aria-label="Manual da sintaxe de busca"
            style={{
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <CircleHelp size={14} />
          </button>
        }
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
      <div ref={resultsScrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 16px 12px' }}>
        {isLoading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === '2col' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
              gap: '12px',
            }}
          >
            {Array.from({ length: viewMode === '2col' ? 6 : 3 }).map((_, i) => (
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

        {!isLoading && !hasSearched && recent.length > 0 && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Buscas recentes
              </p>
              <button
                onClick={clearRecent}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Limpar
              </button>
            </div>
            {recent.map((term) => (
              <div
                key={term}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => runRecent(term)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <History size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {term}
                  </span>
                </button>
                <button
                  onClick={() => removeRecent(term)}
                  aria-label={`Remover "${term}" do histórico`}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '10px 4px',
                    display: 'flex',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !hasSearched && recent.length === 0 && (
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

        {!isLoading && !error && results.length > 0 && totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCards={totalCards}
            loadingMore={loadingMore}
            onPrev={() => goToPage(page - 1)}
            onNext={() => goToPage(page + 1)}
          />
        )}

        {!isLoading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: viewMode === '2col' ? 'repeat(2, 1fr)' : 'repeat(1, 1fr)',
              gap: '12px',
            }}
          >
            {pageCards.map((card, i) => {
              const qty = deckCardMap[card.id] ?? 0;
              const imageUrl =
                card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null;
              const priceLink = getCardPriceLink(card, usdBrlRate, priceSource);

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
                      highlightInDeck={qty > 0}
                      highlightError={errorCardIds.has(card.id)}
                    />
                    <CardActionsOverlay
                      qty={qty}
                      onAdd={(e) => handleQuickAdd(card, e)}
                      onRemove={(e) => handleQuickRemove(card, e)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
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
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Pagination — same 60-card pages as scryfall.com */}
        {!isLoading && !error && results.length > 0 && totalPages > 1 && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCards={totalCards}
            loadingMore={loadingMore}
            onPrev={() => goToPage(page - 1)}
            onNext={() => goToPage(page + 1)}
          />
        )}

        {pageError && (
          <p style={{ fontSize: '12px', color: 'var(--error)', textAlign: 'center', padding: '0 0 12px' }}>
            Falha ao carregar mais resultados. Toque em "Próxima" para tentar novamente.
          </p>
        )}
      </div>

      {/* Scryfall syntax manual */}
      <SyntaxHelpSheet isOpen={syntaxHelpOpen} onClose={() => setSyntaxHelpOpen(false)} />

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
