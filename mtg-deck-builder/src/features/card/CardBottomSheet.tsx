import React from 'react';
import { motion } from 'framer-motion';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { Button } from '../../design-system/components/Button';
import { Badge } from '../../design-system/components/Badge';
import { ManaSymbol, ManaCost, SymbolText } from '../../design-system/components/ManaSymbol';
import { CardImage } from './CardImage';
import { DeckCard, ScryfallCard, DEFAULT_CATEGORIES, ManaColor, Deck } from '../../types';
import { useDeckStore, materializeCategories } from '../../store/useDeckStore';
import { scryfallToDeckCard, canBeCommanderCard } from './cardUtils';
import { Crown, Plus, Minus, ChevronDown, RefreshCw, Users, UserMinus, ExternalLink } from 'lucide-react';
import { getUsdBrlRate, formatBrl, ligaMagicUrl } from '../../lib/usdBrl';
import { getPriceSource, tcgplayerUrl } from '../../lib/priceSource';

function canBePartnerWith(
  card: ScryfallCard,
  existingCard: DeckCard | null | undefined,
  commanderDeckCard: DeckCard | null
): boolean {
  if (!commanderDeckCard) return false;
  const cardKw = card.keywords ?? existingCard?.keywords ?? [];
  const cardType = card.type_line ?? '';
  const cmdKw = commanderDeckCard.keywords ?? [];
  const cmdType = commanderDeckCard.typeLine ?? '';
  const cmdName = commanderDeckCard.name;
  const cardName = card.name;

  if (cardKw.includes('Partner') && cmdKw.includes('Partner')) return true;

  const cardPW = cardKw.find((k) => k.startsWith('Partner with '));
  if (cardPW && cardPW.slice('Partner with '.length) === cmdName) return true;

  const cmdPW = cmdKw.find((k) => k.startsWith('Partner with '));
  if (cmdPW && cmdPW.slice('Partner with '.length) === cardName) return true;

  if (cardKw.includes('Friends forever') && cmdKw.includes('Friends forever')) return true;

  if (cardKw.includes("Doctor's companion") && cmdType.includes('Doctor')) return true;
  if (cmdKw.includes("Doctor's companion") && cardType.includes('Doctor')) return true;

  if (cardType.includes('Background') && cmdKw.includes('Choose a Background')) return true;
  if (cardKw.includes('Choose a Background') && cmdType.includes('Background')) return true;

  return false;
}

// Full-card fetches keyed by Scryfall id, shared across sheet opens for the
// whole session so re-opening a card doesn't re-hit the API.
const fullCardCache = new Map<string, ScryfallCard>();

interface CardBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  card: ScryfallCard | null;
  deckId: string;
  existingCard?: DeckCard | null;
  deck?: Deck | null;
}

function parseManaSymbols(manaCost: string | null): ManaColor[] {
  if (!manaCost) return [];
  const matches = manaCost.match(/\{([WUBRG])\}/g) || [];
  return matches.map((m) => m[1] as ManaColor);
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
  card: cardProp,
  deckId,
  existingCard,
  deck,
}: CardBottomSheetProps) {
  const { addCard, removeCard, setCardQuantity, setCommander, setPartner, removePartner, updateCardCategory, patchCardData } = useDeckStore();
  const [selectedCategory, setSelectedCategory] = React.useState('Outros');
  const [flipped, setFlipped] = React.useState(false);
  const [fetchedCard, setFetchedCard] = React.useState<ScryfallCard | null>(null);
  const [qtyInput, setQtyInput] = React.useState('0');
  const [usdBrlRate, setUsdBrlRate] = React.useState<number | null>(null);
  // Re-read on each open so changing the reference store in Settings takes
  // effect without needing to close the deck.
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

  // Cards opened from the decklist only carry the slim stored data (no set,
  // rarity, oracle text). Fetch the full card from Scryfall to fill it in —
  // cached by id so re-opening the same card doesn't re-hit the API.
  React.useEffect(() => {
    setFetchedCard(null);
    if (!isOpen || !cardProp || cardProp.set_name) return;
    const cached = fullCardCache.get(cardProp.id);
    if (cached) {
      setFetchedCard(cached);
      return;
    }
    let cancelled = false;
    fetch(`https://api.scryfall.com/cards/${encodeURIComponent(cardProp.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const full = data as ScryfallCard;
        fullCardCache.set(full.id, full);
        setFetchedCard(full);
        // Backfill fields older builds didn't store (keywords, colorIdentity,
        // backImageUrl) so features like partner detection heal over time
        if (existingCard) {
          const fresh = scryfallToDeckCard(full, existingCard.category);
          patchCardData(deckId, full.id, {
            keywords: fresh.keywords,
            colorIdentity: fresh.colorIdentity,
            backImageUrl: fresh.backImageUrl,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cardProp?.id, cardProp?.set_name]);

  const card = fetchedCard && cardProp && fetchedCard.id === cardProp.id ? fetchedCard : cardProp;

  // Keep the quantity field in sync with the deck (button presses, reopen, etc.)
  React.useEffect(() => {
    setQtyInput(String(existingCard?.quantity ?? 0));
  }, [existingCard?.quantity, cardProp?.id]);

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

  // A real back face exists only when there's a second face with its own image
  // (split/adventure/aftermath cards have ' // ' names but a single image)
  const backImageUrl =
    existingCard?.backImageUrl || card.card_faces?.[1]?.image_uris?.normal || null;
  const isDfc = Boolean(backImageUrl);

  const usdPriceRaw = card.prices?.usd ? parseFloat(card.prices.usd) : NaN;
  const usdPrice = Number.isFinite(usdPriceRaw) ? usdPriceRaw : null;

  const isInDeck = !!existingCard;
  const quantity = existingCard?.quantity ?? 0;
  const canBeCommander = canBeCommanderCard(card);
  const manaColors = parseManaSymbols(card.mana_cost);

  const isCommander = !!deck?.commanderId && deck.commanderId === card.id;
  const isPartner = !!deck?.partnerId && deck.partnerId === card.id;
  const commanderDeckCard = deck?.commanderId
    ? (deck.cards.find((c) => c.scryfallId === deck!.commanderId) ?? null)
    : null;
  const showPartnerButton =
    !isCommander &&
    !isPartner &&
    canBeCommander &&
    !!deck?.commanderId &&
    canBePartnerWith(card, existingCard, commanderDeckCard);

  function toDeckCard(): DeckCard {
    const built = scryfallToDeckCard(card!, selectedCategory);
    // Fake cards built from stored deck data lack keywords on the Scryfall
    // shape; keep whatever the stored card already knew
    if (built.keywords!.length === 0 && existingCard?.keywords?.length) {
      built.keywords = existingCard.keywords;
    }
    return built;
  }

  function handleAdd() {
    addCard(deckId, { ...toDeckCard(), category: selectedCategory });
  }

  function handleRemove() {
    removeCard(deckId, card!.id);
    if (quantity <= 1) onClose();
  }

  function commitQuantity(q: number) {
    if (q === quantity) return;
    if (isInDeck) {
      setCardQuantity(deckId, card!.id, q);
    } else if (q > 0) {
      addCard(deckId, { ...toDeckCard(), category: selectedCategory });
      if (q > 1) setCardQuantity(deckId, card!.id, q);
    }
  }

  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 3);
    setQtyInput(val);
    if (val !== '') commitQuantity(parseInt(val, 10));
  }

  function handleQtyBlur() {
    if (!/^\d+$/.test(qtyInput)) setQtyInput(String(quantity));
  }

  function handleSetCommander() {
    setCommander(deckId, { ...toDeckCard(), category: 'Comandante' });
    onClose();
  }

  function handleSetPartner() {
    setPartner(deckId, { ...toDeckCard(), category: 'Comandante' });
    onClose();
  }

  function handleRemovePartner() {
    removePartner(deckId);
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

  // Deck's managed sections (self-healed union with categories cards use);
  // always include the current selection so the select never shows a phantom value
  const materialized = deck ? materializeCategories(deck) : [];
  const baseCategories: string[] =
    materialized.length > 0 ? materialized : [...DEFAULT_CATEGORIES];
  const categoryOptions = baseCategories.includes(selectedCategory)
    ? baseCategories
    : [...baseCategories, selectedCategory];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={card.name} maxHeight="92dvh">
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
                <ManaCost cost={card.mana_cost} size="sm" />
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
                <SymbolText text={oracleText} />
              </p>
            </div>
          )}

          {/* Set + rarity — only when we have real Scryfall data (deck-stored cards don't keep it) */}
          {card.set_name && (
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
          )}

          {/* Price — Scryfall USD, plus a link to the user's chosen reference store */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Preço
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {usdPrice !== null && (
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  US$ {usdPrice.toFixed(2)}
                </span>
              )}
              <a
                href={priceSource === 'ligamagic' ? ligaMagicUrl(card.name) : tcgplayerUrl(card.name)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                {priceSource === 'ligamagic'
                  ? usdPrice !== null && usdBrlRate !== null
                    ? `≈ ${formatBrl(usdPrice * usdBrlRate)} · LigaMagic`
                    : 'Ver na LigaMagic'
                  : 'Ver na TCGplayer'}
                <ExternalLink size={12} />
              </a>
            </div>
            {priceSource === 'ligamagic' && usdPrice !== null && usdBrlRate !== null && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Estimativa pela cotação do dia (fonte: TCGplayer via Scryfall)
              </span>
            )}
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
              {categoryOptions.map((cat) => (
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
          {isCommander && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'rgba(234,179,8,0.08)',
              border: '1px solid rgba(234,179,8,0.25)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}>
              <Crown size={13} style={{ color: '#eab308', flexShrink: 0 }} />
              Comandante deste deck
            </div>
          )}

          {isPartner && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<UserMinus size={15} />}
              onClick={handleRemovePartner}
              style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
            >
              Remover Parceiro
            </Button>
          )}

          {!isCommander && canBeCommander && (
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

          {showPartnerButton && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leftIcon={<Users size={15} />}
              onClick={handleSetPartner}
            >
              Definir como Parceiro
            </Button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={qtyInput}
              onChange={handleQtyChange}
              onBlur={handleQtyBlur}
              inputMode="numeric"
              aria-label="Quantidade"
              style={{
                width: '56px',
                height: '36px',
                flexShrink: 0,
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'inherit',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
              }}
            />
            <Button
              variant="danger"
              size="md"
              leftIcon={<Minus size={15} />}
              onClick={handleRemove}
              disabled={!isInDeck}
              style={{ flex: 1 }}
            >
              Remover
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus size={15} />}
              onClick={handleAdd}
              style={{ flex: 1 }}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
