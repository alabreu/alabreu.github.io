import { safeGetItem, safeSetItem } from './safeStorage';

// User-facing deck-building preferences (live in the Settings sheet on the Home
// menu). Kept separate from per-deck data so they apply across all decks.

export type GroupMode = 'off' | 'type' | 'function';

const GROUP_MODE_KEY = 'deck-group-mode';
const LEGACY_AUTO_GROUP_KEY = 'auto-group-enabled'; // pre-3-way boolean
const GROUP_MODE_EVENT = 'deck-group-mode-change';

/** How newly added cards are auto-filed into categories:
 *  - 'off': everything to "Outros" (organize by hand / custom groups)
 *  - 'type': by card type — Criaturas, Feitiços, Terrenos… (Archidekt default)
 *  - 'function': by community function tags — Ramp, Remoção, Compra de Cartas…
 *  Only affects cards added from now on; never re-shuffles existing groups. */
export function getGroupMode(): GroupMode {
  const stored = safeGetItem(GROUP_MODE_KEY);
  if (stored === 'off' || stored === 'type' || stored === 'function') return stored;
  // Migrate from the old boolean toggle: '0' meant off, anything else meant on
  // (which was type-based). Absent → default to type.
  const legacy = safeGetItem(LEGACY_AUTO_GROUP_KEY);
  return legacy === '0' ? 'off' : 'type';
}

export function setGroupMode(mode: GroupMode): void {
  safeSetItem(GROUP_MODE_KEY, mode);
  window.dispatchEvent(new Event(GROUP_MODE_EVENT));
}

export function subscribeGroupMode(callback: () => void): () => void {
  window.addEventListener(GROUP_MODE_EVENT, callback);
  return () => window.removeEventListener(GROUP_MODE_EVENT, callback);
}
