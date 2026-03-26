export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export type Deck = {
  id: string;
  name: string;
  commanderId: string | null;
  commanderName: string | null;
  commanderArtUrl: string | null;
  colorIdentity: ManaColor[];
  cards: DeckCard[];
  createdAt: number;
  updatedAt: number;
};

export type DeckCard = {
  scryfallId: string;
  name: string;
  quantity: number;
  category: string;
  imageUrl: string | null;
  artCropUrl: string | null;
  manaCost: string | null;
  typeLine: string | null;
  cmc: number;
};

export type ScryfallCard = {
  id: string;
  name: string;
  mana_cost: string | null;
  cmc: number;
  type_line: string;
  oracle_text: string | null;
  colors: string[] | null;
  color_identity: string[];
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  rarity: string;
  set_name: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost: string;
    type_line: string;
    oracle_text: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
      art_crop: string;
      border_crop: string;
    };
  }>;
  legalities: {
    commander: string;
  };
};

export const DEFAULT_CATEGORIES = [
  'Comandante',
  'Terrenos',
  'Ramp',
  'Compra de Cartas',
  'Remoção',
  'Proteção',
  'Wincons',
  'Outros',
] as const;

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number];
