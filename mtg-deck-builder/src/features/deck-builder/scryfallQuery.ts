import { ManaColor } from '../../types';

export type ColorMode = 'include' | 'exact' | 'atmost';

export type SearchFilters = {
  oracle: string;
  types: string;
  colors: ManaColor[];
  colorMode: ColorMode;
  identity: ManaColor[];
  mvMin: string;
  mvMax: string;
  powMin: string;
  powMax: string;
  touMin: string;
  touMax: string;
  rarities: string[]; // 'c' | 'u' | 'r' | 'm'
  set: string;
  commanderLegal: boolean;
};

export const EMPTY_FILTERS: SearchFilters = {
  oracle: '',
  types: '',
  colors: [],
  colorMode: 'include',
  identity: [],
  mvMin: '',
  mvMax: '',
  powMin: '',
  powMax: '',
  touMin: '',
  touMax: '',
  rarities: [],
  set: '',
  commanderLegal: true,
};

export function hasActiveFilters(f: SearchFilters): boolean {
  return !!(
    f.oracle.trim() ||
    f.types.trim() ||
    f.colors.length ||
    f.identity.length ||
    f.mvMin ||
    f.mvMax ||
    f.powMin ||
    f.powMax ||
    f.touMin ||
    f.touMax ||
    f.rarities.length ||
    f.set.trim() ||
    !f.commanderLegal
  );
}

/** Split on whitespace but keep "quoted phrases" together. */
function terms(input: string): string[] {
  return input.trim().match(/"[^"]*"|\S+/g) ?? [];
}

const COLOR_OP: Record<ColorMode, string> = {
  include: '>=',
  exact: '=',
  atmost: '<=',
};

/**
 * Builds a Scryfall search query. The free-text `text` is passed through
 * verbatim, so the full Scryfall syntax (t:, o:, c:, id:, mv:, is:, etc.)
 * works directly; structured filters are appended as additional terms.
 */
export function buildScryfallQuery(text: string, f: SearchFilters): string {
  const parts: string[] = [];

  const t = text.trim();
  if (t) parts.push(t);

  for (const w of terms(f.oracle)) parts.push(`o:${w}`);
  for (const w of terms(f.types)) parts.push(`t:${w}`);

  if (f.colors.length > 0) {
    parts.push(`c${COLOR_OP[f.colorMode]}${f.colors.join('').toLowerCase()}`);
  }
  if (f.identity.length > 0) {
    parts.push(`id<=${f.identity.join('').toLowerCase()}`);
  }

  if (f.mvMin !== '') parts.push(`mv>=${f.mvMin}`);
  if (f.mvMax !== '') parts.push(`mv<=${f.mvMax}`);
  if (f.powMin !== '') parts.push(`pow>=${f.powMin}`);
  if (f.powMax !== '') parts.push(`pow<=${f.powMax}`);
  if (f.touMin !== '') parts.push(`tou>=${f.touMin}`);
  if (f.touMax !== '') parts.push(`tou<=${f.touMax}`);

  if (f.rarities.length === 1) {
    parts.push(`r:${f.rarities[0]}`);
  } else if (f.rarities.length > 1) {
    parts.push(`(${f.rarities.map((r) => `r:${r}`).join(' or ')})`);
  }

  if (f.set.trim()) parts.push(`s:${f.set.trim().toLowerCase()}`);
  if (f.commanderLegal) parts.push('f:commander');

  if (parts.length === 0) parts.push('f:commander');
  // Paper printings only — hides Arena/Alchemy-exclusive cards
  parts.push('game:paper');

  return parts.join(' ');
}

// Card types/supertypes matched via `type:` — never valid after `subtype:`
// (not an operator) or `keyword:` (that's for ability words like lifelink).
const TYPE_WORDS = new Set([
  'artifact', 'creature', 'sorcery', 'instant', 'enchantment', 'planeswalker',
  'land', 'battle', 'tribal', 'kindred', 'legendary', 'basic', 'snow',
  'equipment', 'aura', 'vehicle', 'saga', 'background',
]);

/**
 * Resilience net for Scryfall queries the Tutor suggests: the LLM sometimes
 * invents operators that aren't valid syntax (`subtype:equipment`,
 * `keyword:artifact`), which produce a syntax error or empty result when the
 * user taps the query chip. This normalizes the unambiguous mistakes into valid
 * syntax. The primary fix is the prompt cheatsheet (tutorPersona.ts); this
 * catches the cases where the model still slips.
 */
export function normalizeScryfallQuery(raw: string): string {
  let q = raw.trim();

  // Smart quotes → straight quotes (Scryfall only understands ").
  q = q.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // `subtype:` is not a Scryfall operator — subtypes are matched by `type:`.
  q = q.replace(/\bsubtype\s*:/gi, 'type:');

  // `keyword:` is only valid before an actual ability word; when the model put
  // a card TYPE after it (keyword:artifact) it meant the type — remap to
  // `type:`. Genuine keywords (keyword:lifelink) are left untouched.
  q = q.replace(/\bkeyword\s*:\s*("?)([a-zA-Z]+)\1/g, (m, _quote, word) =>
    TYPE_WORDS.has(word.toLowerCase()) ? `type:${word}` : m
  );

  // Collapse whitespace runs the replacements above can introduce.
  return q.replace(/\s+/g, ' ').trim();
}
