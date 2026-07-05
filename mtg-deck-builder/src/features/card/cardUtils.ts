import { DeckCard, ManaColor, ScryfallCard } from '../../types';

const VALID_COLORS = ['W', 'U', 'B', 'R', 'G', 'C'];

export function scryfallToDeckCard(card: ScryfallCard, category: string): DeckCard {
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
      (c): c is ManaColor => VALID_COLORS.includes(c)
    ),
    keywords: card.keywords ?? [],
  };
}

export function defaultCategoryFor(card: ScryfallCard): string {
  return card.type_line?.includes('Land') ? 'Terrenos' : 'Outros';
}
