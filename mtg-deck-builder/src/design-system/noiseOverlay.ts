import { safeGetItem, safeSetItem } from '../lib/safeStorage';

const NOISE_KEY = 'noise-overlay-enabled';
const NOISE_CHANGE_EVENT = 'noise-overlay-change';

export function getNoiseEnabled(): boolean {
  // On by default — enabled unless the user explicitly turned it off ('0').
  // (No stored value → on; '1' → on; '0' → off, respecting an explicit choice.)
  return safeGetItem(NOISE_KEY) !== '0';
}

export function setNoiseEnabled(enabled: boolean): void {
  safeSetItem(NOISE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(NOISE_CHANGE_EVENT));
}

export function subscribeNoiseEnabled(callback: () => void): () => void {
  window.addEventListener(NOISE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(NOISE_CHANGE_EVENT, callback);
}
