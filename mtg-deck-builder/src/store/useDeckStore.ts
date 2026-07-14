import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Deck, DeckCard, ManaColor, DEFAULT_CATEGORIES } from '../types';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../lib/safeStorage';

type DeckStore = {
  decks: Deck[];
  createDeck: (name: string) => Deck;
  deleteDeck: (id: string) => void;
  updateDeck: (id: string, updates: Partial<Omit<Deck, 'id' | 'createdAt'>>) => void;
  addCard: (deckId: string, card: DeckCard) => void;
  removeCard: (deckId: string, scryfallId: string) => void;
  setCardQuantity: (deckId: string, scryfallId: string, quantity: number) => void;
  setCommander: (deckId: string, card: DeckCard) => void;
  setPartner: (deckId: string, card: DeckCard) => void;
  removePartner: (deckId: string) => void;
  updateCardCategory: (deckId: string, scryfallId: string, category: string) => void;
  patchCardData: (
    deckId: string,
    scryfallId: string,
    patch: Partial<Omit<DeckCard, 'scryfallId' | 'quantity' | 'category'>>
  ) => void;
  importCards: (deckId: string, cards: DeckCard[]) => void;
  healDeck: (deckId: string) => void;
  reorderCategories: (deckId: string, categories: string[]) => void;
  addCategory: (deckId: string, name: string) => void;
  deleteCategory: (deckId: string, name: string) => void;
  groupLandsIntoSection: (deckId: string, sectionName: string) => void;
};

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseColorIdentity(colors: string[]): ManaColor[] {
  const validColors: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
  return colors.filter((c): c is ManaColor => validColors.includes(c as ManaColor));
}

const DEFAULT_ORDER: string[] = [...DEFAULT_CATEGORIES];

/** Color identity of a stored card, falling back to parsing its mana cost. */
function colorIdentityOf(card: DeckCard | null | undefined): ManaColor[] {
  if (!card) return [];
  if (card.colorIdentity && card.colorIdentity.length > 0) return card.colorIdentity;
  return parseColorIdentity(
    card.manaCost
      ? card.manaCost
          .replace(/[^WUBRGC]/g, '')
          .split('')
          .filter((c, i, arr) => arr.indexOf(c) === i)
      : []
  );
}

/**
 * Applies commander/partner metadata healing after a card is fully removed:
 * clears stale references, promotes the partner if the commander left, and
 * recomputes the deck's color identity.
 */
function afterCardRemoved(d: Deck, removedId: string, cards: DeckCard[]): Deck {
  let { commanderId, commanderName, commanderArtUrl } = d;
  let partnerId = d.partnerId ?? null;
  let partnerName = d.partnerName ?? null;
  let partnerArtUrl = d.partnerArtUrl ?? null;
  let colorIdentity = d.colorIdentity;

  if (removedId === d.partnerId) {
    partnerId = partnerName = partnerArtUrl = null;
    colorIdentity = colorIdentityOf(cards.find((c) => c.scryfallId === commanderId));
  }
  if (removedId === d.commanderId) {
    if (partnerId && partnerId !== removedId) {
      // Promote the partner to sole commander
      commanderId = partnerId;
      commanderName = partnerName;
      commanderArtUrl = partnerArtUrl;
      partnerId = partnerName = partnerArtUrl = null;
      colorIdentity = colorIdentityOf(cards.find((c) => c.scryfallId === commanderId));
    } else {
      commanderId = commanderName = commanderArtUrl = null;
      colorIdentity = [];
    }
  }

  return {
    ...d,
    cards,
    commanderId,
    commanderName,
    commanderArtUrl,
    partnerId,
    partnerName,
    partnerArtUrl,
    colorIdentity,
    updatedAt: Date.now(),
  };
}

/** Merges a second color set into a base identity, in WUBRG order. */
function mergeColorIdentity(base: ManaColor[], extra: ManaColor[]): ManaColor[] {
  const ORDER: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];
  const merged = ORDER.filter((c) => base.includes(c) || extra.includes(c));
  return merged.length > 0 ? merged : [...new Set([...base, ...extra])];
}

/**
 * Self-heals commander/partner bookkeeping for decks that have cards tagged
 * "Comandante" (e.g. from a decklist import with a "// Comandante" header or
 * "[Commander]" inline tag) but whose commanderId/partnerId fields were never
 * wired up to match — the import flow only stores the category, not the
 * dedicated commander/partner metadata. Never overrides an already-registered
 * commander; only fills in what's missing.
 */
export function healCommanderPair(d: Deck): Deck {
  const commanderCards = d.cards.filter((c) => c.category === 'Comandante');
  if (commanderCards.length === 0) return d;

  let commanderId = d.commanderId;
  let commanderName = d.commanderName;
  let commanderArtUrl = d.commanderArtUrl;
  let partnerId = d.partnerId ?? null;
  let partnerName = d.partnerName ?? null;
  let partnerArtUrl = d.partnerArtUrl ?? null;
  let colorIdentity = d.colorIdentity;
  let changed = false;

  if (!commanderId) {
    const first = commanderCards[0];
    commanderId = first.scryfallId;
    commanderName = first.name;
    commanderArtUrl = first.artCropUrl;
    colorIdentity = colorIdentityOf(first);
    changed = true;
  }

  const second = commanderCards.find((c) => c.scryfallId !== commanderId);
  if (second && partnerId !== second.scryfallId) {
    partnerId = second.scryfallId;
    partnerName = second.name;
    partnerArtUrl = second.artCropUrl;
    colorIdentity = mergeColorIdentity(colorIdentity, colorIdentityOf(second));
    changed = true;
  }

  if (!changed) return d;
  return {
    ...d,
    commanderId,
    commanderName,
    commanderArtUrl,
    partnerId,
    partnerName,
    partnerArtUrl,
    colorIdentity,
    updatedAt: Date.now(),
  };
}

/** Full section list for a deck: saved order (if any) plus every category
 *  actually used by cards. Self-heals partial lists left by older versions. */
export function materializeCategories(d: Pick<Deck, 'cards' | 'categories'>): string[] {
  const present = [...new Set(d.cards.map((c) => c.category))];
  const base =
    d.categories && d.categories.length > 0
      ? [...d.categories]
      : DEFAULT_ORDER.filter((c) => present.includes(c));
  for (const c of [
    ...DEFAULT_ORDER.filter((x) => present.includes(x)),
    ...present,
  ]) {
    if (!base.includes(c)) base.push(c);
  }
  return base;
}

export const useDeckStore = create<DeckStore>()(
  persist(
    (set, get) => ({
      decks: [],

      createDeck: (name: string): Deck => {
        const now = Date.now();
        const deck: Deck = {
          id: generateId(),
          name,
          commanderId: null,
          commanderName: null,
          commanderArtUrl: null,
          colorIdentity: [],
          cards: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ decks: [...state.decks, deck] }));
        return deck;
      },

      deleteDeck: (id: string) => {
        set((state) => ({ decks: state.decks.filter((d) => d.id !== id) }));
      },

      updateDeck: (id: string, updates: Partial<Omit<Deck, 'id' | 'createdAt'>>) => {
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: Date.now() } : d
          ),
        }));
      },

      addCard: (deckId: string, card: DeckCard) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const existing = d.cards.find((c) => c.scryfallId === card.scryfallId);
            const updatedCards = existing
              ? d.cards.map((c) =>
                  c.scryfallId === card.scryfallId
                    ? { ...c, quantity: c.quantity + 1 }
                    : c
                )
              : [...d.cards, { ...card, quantity: 1 }];
            return { ...d, cards: updatedCards, updatedAt: Date.now() };
          }),
        }));
      },

      removeCard: (deckId: string, scryfallId: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const existing = d.cards.find((c) => c.scryfallId === scryfallId);
            if (!existing) return d;
            if (existing.quantity <= 1) {
              return afterCardRemoved(
                d,
                scryfallId,
                d.cards.filter((c) => c.scryfallId !== scryfallId)
              );
            }
            return {
              ...d,
              cards: d.cards.map((c) =>
                c.scryfallId === scryfallId ? { ...c, quantity: c.quantity - 1 } : c
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setCardQuantity: (deckId: string, scryfallId: string, quantity: number) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const existing = d.cards.find((c) => c.scryfallId === scryfallId);
            if (!existing) return d;
            if (quantity <= 0) {
              return afterCardRemoved(
                d,
                scryfallId,
                d.cards.filter((c) => c.scryfallId !== scryfallId)
              );
            }
            return {
              ...d,
              cards: d.cards.map((c) =>
                c.scryfallId === scryfallId ? { ...c, quantity } : c
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setCommander: (deckId: string, card: DeckCard) => {
        const colorIdentity = colorIdentityOf(card);

        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            // Demote the previous commander and partner to 'Outros'
            let cards = d.cards.map((c) => {
              const isOldCommander =
                c.scryfallId === d.commanderId && c.scryfallId !== card.scryfallId;
              const isOldPartner =
                c.scryfallId === d.partnerId && c.scryfallId !== card.scryfallId;
              return isOldCommander || isOldPartner ? { ...c, category: 'Outros' } : c;
            });
            cards = cards.find((c) => c.scryfallId === card.scryfallId)
              ? cards.map((c) =>
                  c.scryfallId === card.scryfallId
                    ? { ...c, category: 'Comandante' }
                    : c
                )
              : [...cards, { ...card, quantity: 1, category: 'Comandante' }];
            return {
              ...d,
              commanderId: card.scryfallId,
              commanderName: card.name,
              commanderArtUrl: card.artCropUrl,
              partnerId: null,
              partnerName: null,
              partnerArtUrl: null,
              colorIdentity,
              cards,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setPartner: (deckId: string, card: DeckCard) => {
        const partnerColors = colorIdentityOf(card);

        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const colorIdentity = mergeColorIdentity(d.colorIdentity, partnerColors);

            const cards = d.cards.find((c) => c.scryfallId === card.scryfallId)
              ? d.cards.map((c) =>
                  c.scryfallId === card.scryfallId
                    ? { ...c, category: 'Comandante' }
                    : c
                )
              : [...d.cards, { ...card, quantity: 1, category: 'Comandante' }];
            return {
              ...d,
              partnerId: card.scryfallId,
              partnerName: card.name,
              partnerArtUrl: card.artCropUrl,
              colorIdentity,
              cards,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      removePartner: (deckId: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId || !d.partnerId) return d;
            const cards = d.cards.map((c) =>
              c.scryfallId === d.partnerId ? { ...c, category: 'Outros' } : c
            );
            const commanderColors = colorIdentityOf(
              cards.find((c) => c.scryfallId === d.commanderId)
            );
            return {
              ...d,
              partnerId: null,
              partnerName: null,
              partnerArtUrl: null,
              colorIdentity: commanderColors,
              cards,
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      patchCardData: (deckId, scryfallId, patch) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            if (!d.cards.some((c) => c.scryfallId === scryfallId)) return d;
            return {
              ...d,
              cards: d.cards.map((c) =>
                c.scryfallId === scryfallId ? { ...c, ...patch } : c
              ),
            };
          }),
        }));
      },

      updateCardCategory: (deckId: string, scryfallId: string, category: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            return {
              ...d,
              cards: d.cards.map((c) =>
                c.scryfallId === scryfallId ? { ...c, category } : c
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      importCards: (deckId: string, cards: DeckCard[]) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            // Single pass with an id→index map instead of findIndex+map per
            // imported card (which was O(n·m) with a full array rebuild each
            // match — janky on large decklist pastes).
            const updated = d.cards.map((c) => ({ ...c }));
            const indexById = new Map(updated.map((c, i) => [c.scryfallId, i]));
            for (const card of cards) {
              const idx = indexById.get(card.scryfallId);
              if (idx !== undefined) {
                updated[idx].quantity += card.quantity;
              } else {
                indexById.set(card.scryfallId, updated.length);
                updated.push({ ...card });
              }
            }
            return healCommanderPair({ ...d, cards: updated, updatedAt: Date.now() });
          }),
        }));
      },
      healDeck: (deckId: string) => {
        set((state) => ({
          decks: state.decks.map((d) => (d.id === deckId ? healCommanderPair(d) : d)),
        }));
      },
      reorderCategories: (deckId: string, categories: string[]) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            // Never persist a list missing sections that cards actually use
            const merged = materializeCategories({ cards: d.cards, categories });
            return { ...d, categories: merged, updatedAt: Date.now() };
          }),
        }));
      },

      addCategory: (deckId: string, name: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const existing = materializeCategories(d);
            if (existing.includes(name)) return d;
            return { ...d, categories: [...existing, name], updatedAt: Date.now() };
          }),
        }));
      },

      deleteCategory: (deckId: string, name: string) => {
        // The commander section is structural — deleting it would orphan the
        // commander card while commanderId still points at it
        if (name === 'Comandante') return;
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const existingCats = materializeCategories(d);
            const hasCardsToMove = d.cards.some((c) => c.category === name);
            let categories = existingCats.filter((c) => c !== name);
            if (hasCardsToMove && !categories.includes('Outros')) {
              categories = [...categories, 'Outros'];
            }
            const cards = d.cards.map((c) =>
              c.category === name ? { ...c, category: 'Outros' } : c
            );
            return { ...d, categories, cards, updatedAt: Date.now() };
          }),
        }));
      },
      groupLandsIntoSection: (deckId: string, sectionName: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const isLand = (typeLine: string | null) =>
              !!typeLine && typeLine.includes('Land');
            const hasLands = d.cards.some(
              (c) => isLand(c.typeLine) && c.category !== 'Comandante' && c.category !== sectionName
            );

            const existing = materializeCategories(d);
            const categories = existing.includes(sectionName)
              ? existing
              : [...existing, sectionName];

            if (!hasLands && existing.includes(sectionName)) return d;

            const cards = d.cards.map((c) =>
              isLand(c.typeLine) && c.category !== 'Comandante'
                ? { ...c, category: sectionName }
                : c
            );
            return { ...d, categories, cards, updatedAt: Date.now() };
          }),
        }));
      },
    }),
    {
      name: 'mtg-deck-builder-storage',
      version: 1,
      // Passthrough migration establishing a versioning baseline. The pre-version
      // ("version 0") persisted shape is identical to v1, so we return it as-is
      // — WITHOUT a migrate fn, bumping the version makes zustand silently
      // DISCARD all existing decks on upgrade (data loss).
      migrate: (persisted) => persisted as { decks: Deck[] },
      // Route persistence through safeStorage so a disabled/full localStorage
      // (Safari private mode, quota exceeded on big decks) degrades to
      // in-memory-only instead of throwing inside a store mutation.
      storage: createJSONStorage(() => ({
        getItem: safeGetItem,
        setItem: safeSetItem,
        removeItem: safeRemoveItem,
      })),
    }
  )
);

export function getDeckById(decks: Deck[], id: string): Deck | undefined {
  return decks.find((d) => d.id === id);
}
