import { safeGetItem, safeSetItem } from './safeStorage';

// User-facing deck-building preferences (live in the Settings sheet on the Home
// menu). Kept separate from per-deck data so they apply across all decks.

const AUTO_GROUP_KEY = 'auto-group-enabled';
const AUTO_GROUP_EVENT = 'auto-group-change';

/** Whether newly added cards are auto-filed into a category by their card type
 *  (Archidekt-style). On by default; turning it off keeps new cards in a single
 *  "Outros" bucket so custom-group users organize manually. Only affects cards
 *  added from now on — never re-shuffles existing (possibly custom) groups. */
export function getAutoGroupEnabled(): boolean {
  return safeGetItem(AUTO_GROUP_KEY) !== '0';
}

export function setAutoGroupEnabled(enabled: boolean): void {
  safeSetItem(AUTO_GROUP_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(AUTO_GROUP_EVENT));
}

export function subscribeAutoGroupEnabled(callback: () => void): () => void {
  window.addEventListener(AUTO_GROUP_EVENT, callback);
  return () => window.removeEventListener(AUTO_GROUP_EVENT, callback);
}
