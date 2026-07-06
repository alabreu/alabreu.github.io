import { Deck } from '../../types';
import { materializeCategories } from '../../store/useDeckStore';

/**
 * Plain-text decklist: one "N Name" line per card, grouped by section with
 * "// Section" comment headers. Comment lines are already ignored by
 * parseDecklist, so this format round-trips through Importar cartas.
 */
export function buildDecklistText(deck: Deck): string {
  const sections = materializeCategories(deck);
  const grouped: Record<string, typeof deck.cards> = {};
  for (const card of deck.cards) {
    (grouped[card.category] ??= []).push(card);
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
