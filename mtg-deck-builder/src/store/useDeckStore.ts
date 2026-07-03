import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Deck, DeckCard, ManaColor } from '../types';

type DeckStore = {
  decks: Deck[];
  createDeck: (name: string) => Deck;
  deleteDeck: (id: string) => void;
  updateDeck: (id: string, updates: Partial<Omit<Deck, 'id' | 'createdAt'>>) => void;
  addCard: (deckId: string, card: DeckCard) => void;
  removeCard: (deckId: string, scryfallId: string) => void;
  setCommander: (deckId: string, card: DeckCard) => void;
  setPartner: (deckId: string, card: DeckCard) => void;
  removePartner: (deckId: string) => void;
  updateCardCategory: (deckId: string, scryfallId: string, category: string) => void;
  importCards: (deckId: string, cards: DeckCard[]) => void;
  reorderCategories: (deckId: string, categories: string[]) => void;
  addCategory: (deckId: string, name: string) => void;
  deleteCategory: (deckId: string, name: string) => void;
};

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseColorIdentity(colors: string[]): ManaColor[] {
  const validColors: ManaColor[] = ['W', 'U', 'B', 'R', 'G', 'C'];
  return colors.filter((c): c is ManaColor => validColors.includes(c as ManaColor));
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
            const updatedCards =
              existing.quantity > 1
                ? d.cards.map((c) =>
                    c.scryfallId === scryfallId
                      ? { ...c, quantity: c.quantity - 1 }
                      : c
                  )
                : d.cards.filter((c) => c.scryfallId !== scryfallId);
            return { ...d, cards: updatedCards, updatedAt: Date.now() };
          }),
        }));
      },

      setCommander: (deckId: string, card: DeckCard) => {
        const colorIdentity = card.colorIdentity?.length
          ? card.colorIdentity
          : parseColorIdentity(
              card.manaCost
                ? card.manaCost
                    .replace(/[^WUBRGC]/g, '')
                    .split('')
                    .filter((c, i, arr) => arr.indexOf(c) === i)
                : []
            );

        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            // Move old partner to 'Outros' if clearing it
            let cards = d.cards;
            if (d.partnerId && d.partnerId !== card.scryfallId) {
              cards = cards.map((c) =>
                c.scryfallId === d.partnerId ? { ...c, category: 'Outros' } : c
              );
            }
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
        const partnerColors = card.colorIdentity?.length
          ? card.colorIdentity
          : parseColorIdentity(
              card.manaCost
                ? card.manaCost
                    .replace(/[^WUBRGC]/g, '')
                    .split('')
                    .filter((c, i, arr) => arr.indexOf(c) === i)
                : []
            );

        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const ORDER: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];
            const merged = ORDER.filter(
              (c) => d.colorIdentity.includes(c) || partnerColors.includes(c)
            );
            const colorIdentity: ManaColor[] =
              merged.length > 0
                ? merged
                : [...new Set([...d.colorIdentity, ...partnerColors])];

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
            const commander = cards.find((c) => c.scryfallId === d.commanderId);
            const commanderColors: ManaColor[] =
              commander?.colorIdentity && commander.colorIdentity.length > 0
                ? commander.colorIdentity
                : parseColorIdentity(
                    commander?.manaCost
                      ? commander.manaCost
                          .replace(/[^WUBRGC]/g, '')
                          .split('')
                          .filter((c, i, arr) => arr.indexOf(c) === i)
                      : []
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
            let updated = [...d.cards];
            for (const card of cards) {
              const idx = updated.findIndex((c) => c.scryfallId === card.scryfallId);
              if (idx >= 0) {
                updated = updated.map((c, i) =>
                  i === idx ? { ...c, quantity: c.quantity + card.quantity } : c
                );
              } else {
                updated.push({ ...card });
              }
            }
            return { ...d, cards: updated, updatedAt: Date.now() };
          }),
        }));
      },
      reorderCategories: (deckId: string, categories: string[]) => {
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === deckId ? { ...d, categories, updatedAt: Date.now() } : d
          ),
        }));
      },

      addCategory: (deckId: string, name: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const existing = d.categories ?? [];
            if (existing.includes(name)) return d;
            return { ...d, categories: [...existing, name], updatedAt: Date.now() };
          }),
        }));
      },

      deleteCategory: (deckId: string, name: string) => {
        set((state) => ({
          decks: state.decks.map((d) => {
            if (d.id !== deckId) return d;
            const DEFAULT_ORDER = [
              'Comandante', 'Terrenos', 'Ramp', 'Compra de Cartas',
              'Remoção', 'Proteção', 'Wincons', 'Outros',
            ];
            // Resolve the full explicit category list; if never set, derive it from cards
            const present = [...new Set(d.cards.map((c) => c.category))];
            const existingCats =
              d.categories && d.categories.length > 0
                ? d.categories
                : [
                    ...DEFAULT_ORDER.filter((c) => present.includes(c)),
                    ...present.filter((c) => !DEFAULT_ORDER.includes(c)),
                  ];

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
    }),
    {
      name: 'mtg-deck-builder-storage',
    }
  )
);

export function getDeckById(decks: Deck[], id: string): Deck | undefined {
  return decks.find((d) => d.id === id);
}
