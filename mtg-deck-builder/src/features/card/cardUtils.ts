import { DeckCard, ManaColor, ScryfallCard } from '../../types';
import { getGroupMode } from '../../lib/deckSettings';
import { getFunctionCategorySync } from '../../lib/functionTags';

const VALID_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'];

/**
 * Canonical ScryfallCard → DeckCard conversion. Every flow that stores a card
 * (search, card sheet, new-deck, import) must use this so persisted cards
 * always carry keywords/backImageUrl/colorIdentity.
 */
export function scryfallToDeckCard(
  card: ScryfallCard,
  category: string,
  quantity = 1
): DeckCard {
  const face0 = card.card_faces?.[0];
  const face1 = card.card_faces?.[1];
  return {
    scryfallId: card.id,
    oracleId: card.oracle_id ?? null,
    name: card.name,
    quantity,
    category,
    imageUrl: (card.image_uris ?? face0?.image_uris)?.normal ?? null,
    artCropUrl: (card.image_uris ?? face0?.image_uris)?.art_crop ?? null,
    backImageUrl: face1?.image_uris?.normal ?? null,
    manaCost: card.mana_cost ?? face0?.mana_cost ?? null,
    typeLine: card.type_line ?? face0?.type_line ?? null,
    cmc: card.cmc,
    colorIdentity: (card.color_identity ?? []).filter(
      (c): c is ManaColor => VALID_COLORS.includes(c)
    ),
    keywords: card.keywords ?? [],
  };
}

// Type-based categories (Archidekt-style), in precedence order — an "Artifact
// Creature" files under Criaturas, a "Legendary Creature" under Criaturas, etc.
// Lands always win (handled first) so mana rocks that are lands still go to
// Terrenos. Used only when auto-grouping is enabled.
const TYPE_CATEGORY_ORDER: { match: string; category: string }[] = [
  { match: 'Creature', category: 'Criaturas' },
  { match: 'Planeswalker', category: 'Planeswalkers' },
  { match: 'Instant', category: 'Instantâneos' },
  { match: 'Sorcery', category: 'Feitiços' },
  { match: 'Artifact', category: 'Artefatos' },
  { match: 'Enchantment', category: 'Encantamentos' },
  { match: 'Battle', category: 'Batalhas' },
];

function typeCategoryFor(typeLine: string): string {
  for (const { match, category } of TYPE_CATEGORY_ORDER) {
    if (typeLine.includes(match)) return category;
  }
  return 'Outros';
}

/** The category a freshly added card should land in. Lands → Terrenos always.
 *  Then depends on the grouping mode: 'off' → Outros; 'type' → by card type;
 *  'function' → by community function tag (Ramp/Remoção/…), falling back to
 *  Outros for cards not in the snapshot. */
export function defaultCategoryFor(card: ScryfallCard): string {
  const typeLine = card.type_line ?? card.card_faces?.[0]?.type_line ?? '';
  if (typeLine.includes('Land')) return 'Terrenos';

  const mode = getGroupMode();
  if (mode === 'off') return 'Outros';
  if (mode === 'function') {
    const oid = card.oracle_id ?? undefined;
    return getFunctionCategorySync(oid) ?? 'Outros';
  }
  return typeCategoryFor(typeLine);
}

/** Commander eligibility: legendary creature, or a planeswalker whose text allows it. */
export function canBeCommanderCard(card: ScryfallCard): boolean {
  const typeLine = card.type_line ?? card.card_faces?.[0]?.type_line ?? '';
  if (typeLine.includes('Legendary') && typeLine.includes('Creature')) return true;
  if (typeLine.includes('Legendary') && typeLine.includes('Planeswalker')) {
    const oracle =
      card.oracle_text ??
      card.card_faces?.map((f) => f.oracle_text).join('\n') ??
      '';
    return oracle.includes('can be your commander');
  }
  return false;
}
