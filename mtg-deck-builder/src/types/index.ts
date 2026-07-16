export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export type Deck = {
  id: string;
  name: string;
  commanderId: string | null;
  commanderName: string | null;
  commanderArtUrl: string | null;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerArtUrl?: string | null;
  colorIdentity: ManaColor[];
  cards: DeckCard[];
  categories?: string[];
  createdAt: number;
  updatedAt: number;
};

export type DeckCard = {
  scryfallId: string;
  /** Scryfall oracle_id (stable across printings) — used for function-tag
   *  grouping. Optional: older stored cards won't have it. */
  oracleId?: string | null;
  name: string;
  quantity: number;
  category: string;
  imageUrl: string | null;
  artCropUrl: string | null;
  backImageUrl?: string | null;
  manaCost: string | null;
  typeLine: string | null;
  cmc: number;
  colorIdentity?: ManaColor[];
  keywords?: string[];
};

export type ScryfallCard = {
  id: string;
  /** Stable id shared by all printings of a card — the key used to look up
   *  community function tags (see functionTags). */
  oracle_id?: string;
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
  keywords?: string[];
  prices?: {
    usd: string | null;
    usd_foil?: string | null;
    eur?: string | null;
  };
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
