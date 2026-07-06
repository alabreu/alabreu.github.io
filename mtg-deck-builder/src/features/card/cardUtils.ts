import { DeckCard, ManaColor, ScryfallCard } from '../../types';

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

export function defaultCategoryFor(card: ScryfallCard): string {
  const typeLine = card.type_line ?? card.card_faces?.[0]?.type_line ?? '';
  return typeLine.includes('Land') ? 'Terrenos' : 'Outros';
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
