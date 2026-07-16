import { safeGetItem, safeSetItem } from './safeStorage';
import type { Language } from './translations';

export interface ChangelogEntry {
  /** Stable id, also used for ordering. ISO date works well. */
  id: string;
  /** Display date (ISO). */
  date: string;
  pt: { title: string; items: string[] };
  en: { title: string; items: string[] };
}

// Curated, NEWEST FIRST. Only user-relevant new features / meaningful
// improvements go here — not every bug fix or small UI tweak. Add a new entry
// at the TOP when shipping something worth announcing.
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-07-16',
    date: '2026-07-16',
    pt: {
      title: 'Tutor mais esperto e buscas confiáveis',
      items: [
        'O Tutor reconhece cartas de crossover (Senhor dos Anéis, Warhammer 40k e outros) e não nega mais cartas que existem de verdade.',
        'As buscas do Scryfall que o Tutor sugere agora são validadas — chega de link que abre uma busca quebrada.',
        'Imagens de cartas mais resilientes a instabilidades do servidor, com nova tentativa automática.',
      ],
    },
    en: {
      title: 'Smarter Tutor and reliable searches',
      items: [
        'The Tutor now recognizes crossover cards (Lord of the Rings, Warhammer 40k and more) and no longer denies real cards.',
        'The Scryfall searches the Tutor suggests are validated now — no more links that open a broken search.',
        'Card images are more resilient to server hiccups, with automatic retry.',
      ],
    },
  },
  {
    id: '2026-07-10',
    date: '2026-07-10',
    pt: {
      title: 'Personalidades do Tutor',
      items: [
        'Escolha entre 6 personalidades para o Tutor — Teferi, Krenko, Mabel, Braids, Ugin ou o padrão.',
        'Instruções personalizadas: diga como você prefere as respostas (mais curtas, faixa de preço, etc.).',
      ],
    },
    en: {
      title: 'Tutor personalities',
      items: [
        'Pick from 6 personalities for the Tutor — Teferi, Krenko, Mabel, Braids, Ugin or the default.',
        'Custom instructions: tell the Tutor how you like your answers (shorter, budget range, etc.).',
      ],
    },
  },
  {
    id: '2026-07-05',
    date: '2026-07-05',
    pt: {
      title: 'Idioma e loja de referência',
      items: [
        'Alterne a interface entre português e inglês pelo menu.',
        'Escolha sua loja de preços: LigaMagic (em reais) ou TCGplayer (em dólar).',
      ],
    },
    en: {
      title: 'Language and reference store',
      items: [
        'Switch the interface between Portuguese and English from the menu.',
        'Pick your price store: LigaMagic (in BRL) or TCGplayer (in USD).',
      ],
    },
  },
];

const SEEN_KEY = 'changelog-last-seen-id';

export function getLatestEntryId(): string | null {
  return CHANGELOG[0]?.id ?? null;
}

/** How many entries are newer than the last one the user saw. A user who never
 *  opened the changelog sees ALL entries as unread (so the feature announces
 *  itself). Entries are newest-first, so unread = index of the last-seen id. */
export function getUnreadCount(): number {
  const seen = safeGetItem(SEEN_KEY);
  if (!seen) return CHANGELOG.length;
  const idx = CHANGELOG.findIndex((e) => e.id === seen);
  return idx < 0 ? CHANGELOG.length : idx;
}

export function markChangelogSeen(): void {
  const latest = getLatestEntryId();
  if (latest) safeSetItem(SEEN_KEY, latest);
}

export function entryText(entry: ChangelogEntry, lang: Language): { title: string; items: string[] } {
  return lang === 'en' ? entry.en : entry.pt;
}
