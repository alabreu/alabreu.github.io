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
  updateCardCategory: (deckId: string, scryfallId: string, category: string) => void;
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
        const colorIdentity = parseColorIdentity(
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
            const cards = d.cards.find((c) => c.scryfallId === card.scryfallId)
              ? d.cards.map((c) =>
                  c.scryfallId === card.scryfallId
                    ? { ...c, category: 'Comandante' }
                    : c
                )
              : [...d.cards, { ...card, quantity: 1, category: 'Comandante' }];
            return {
              ...d,
              commanderId: card.scryfallId,
              commanderName: card.name,
              commanderArtUrl: card.artCropUrl,
              colorIdentity,
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
    }),
    {
      name: 'mtg-deck-builder-storage',
    }
  )
);

export function getDeckById(decks: Deck[], id: string): Deck | undefined {
  return decks.find((d) => d.id === id);
}
