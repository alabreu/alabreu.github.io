import { Deck } from '../../types';
import { materializeCategories } from '../../store/useDeckStore';
import { isCategoryCounted } from '../../lib/deckCounting';

/**
 * Plain-text decklist: one "N Name" line per card, optionally grouped by
 * section with "// Section" comment headers. Comment lines are already
 * ignored by parseDecklist (and read back as section markers by it too),
 * so this format round-trips through Importar cartas.
 *
 * Sections switched off ("fora da contagem") go after the main ones. Without
 * headers they sit under a "SIDEBOARD:" line, which Moxfield reads as the
 * sideboard and parseDecklist skips.
 */
export function buildDecklistText(deck: Deck, opts?: { includeSectionHeaders?: boolean }): string {
  const includeSectionHeaders = opts?.includeSectionHeaders ?? true;
  const all = materializeCategories(deck);
  const mainSections = all.filter((c) => isCategoryCounted(deck, c));
  const sideSections = all.filter((c) => !isCategoryCounted(deck, c));
  const sections = [...mainSections, ...sideSections];
  const grouped: Record<string, typeof deck.cards> = {};
  for (const card of deck.cards) {
    (grouped[card.category] ??= []).push(card);
  }

  if (!includeSectionHeaders) {
    const linesFor = (secs: string[]) =>
      secs.flatMap((section) => (grouped[section] ?? []).map((c) => `${c.quantity} ${c.name}`));
    const main = linesFor(mainSections);
    const side = linesFor(sideSections);
    if (side.length === 0) return main.join('\n');
    return [...main, '', 'SIDEBOARD:', ...side].join('\n');
  }

  const blocks: string[] = [];
  for (const section of sections) {
    const cards = grouped[section];
    if (!cards || cards.length === 0) continue;
    const lines = cards.map((c) => `${c.quantity} ${c.name}`);
    blocks.push(`// ${section}\n${lines.join('\n')}`);
  }

  return blocks.join('\n\n');
}
