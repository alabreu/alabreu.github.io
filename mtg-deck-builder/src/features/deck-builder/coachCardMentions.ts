import React from 'react';
import { ScryfallCard } from '../../types';
import { hydrateCards } from './edhrec';

/** Splits a fenced-code-aware markdown string into paragraph-sized blocks.
 *  A block that's entirely a bullet/numbered list is split further into one
 *  block per item, so each list line gets its own inline card preview
 *  instead of one shared carousel at the end of the whole list. */
export function splitIntoParagraphs(markdown: string): string[] {
  const blocks: string[] = [];
  let buffer: string[] = [];
  let inFence = false;

  function flush() {
    const text = buffer.join('\n').trim();
    if (text) blocks.push(text);
    buffer = [];
  }

  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && line.trim() === '') {
      flush();
      continue;
    }
    buffer.push(line);
  }
  flush();

  const isListLine = (l: string) => /^\s*([-*+]|\d+[.)])\s+/.test(l);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length > 1 && lines.every((l) => isListLine(l) || l.trim() === '')) {
      for (const l of lines) if (l.trim()) out.push(l);
    } else {
      out.push(block);
    }
  }
  return out;
}

/** Candidate card names: anything wrapped in **bold** — the system prompt
 *  instructs the Coach to bold official card names, so this is a reliable
 *  (if imperfect) signal. Names that aren't real cards simply won't resolve
 *  via resolveCardMentions() below, so false positives are a silent no-op. */
export function extractBoldNames(markdown: string): string[] {
  const names = new Set<string>();
  const re = /\*\*([^*\n]+)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    const name = m[1].trim();
    if (name.length >= 2 && name.length <= 80) names.add(name);
  }
  return [...names];
}

const cardCache = new Map<string, ScryfallCard | null>();

/** Resolves candidate names to real Scryfall cards (batched, cached across
 *  the whole session). Names that aren't real cards resolve to nothing —
 *  callers should treat a missing entry as "not a card, render no preview". */
export async function resolveCardMentions(names: string[]): Promise<Map<string, ScryfallCard>> {
  const toFetch = names.filter((n) => !cardCache.has(n.toLowerCase()));
  if (toFetch.length > 0) {
    try {
      const found = await hydrateCards(toFetch);
      const foundByLower = new Map<string, ScryfallCard>();
      for (const c of found) {
        foundByLower.set(c.name.toLowerCase(), c);
        const front = c.card_faces?.[0]?.name;
        if (front && !foundByLower.has(front.toLowerCase())) foundByLower.set(front.toLowerCase(), c);
      }
      for (const name of toFetch) {
        cardCache.set(name.toLowerCase(), foundByLower.get(name.toLowerCase()) ?? null);
      }
    } catch {
      // Network hiccup: leave uncached so a later render can retry, instead
      // of permanently caching a false "not a card" result.
    }
  }
  const result = new Map<string, ScryfallCard>();
  for (const name of names) {
    const c = cardCache.get(name.toLowerCase());
    if (c) result.set(name, c);
  }
  return result;
}

/** Builds a Scryfall search query matching any of the given exact card names. */
export function buildCardNameQuery(names: string[]): string {
  return names
    .slice(0, 40)
    .map((n) => `!"${n.replace(/"/g, '')}"`)
    .join(' or ');
}

/** Resolves a chat message's bolded card-name mentions once it finishes
 *  streaming (never mid-stream, to avoid refetching on every token). */
export function useResolvedCardMentions(content: string, active: boolean) {
  const [resolved, setResolved] = React.useState<Map<string, ScryfallCard>>(new Map());
  React.useEffect(() => {
    if (!active) return;
    const names = extractBoldNames(content);
    if (names.length === 0) return;
    let cancelled = false;
    resolveCardMentions(names).then((map) => {
      if (!cancelled) setResolved(map);
    });
    return () => {
      cancelled = true;
    };
  }, [content, active]);
  return resolved;
}
