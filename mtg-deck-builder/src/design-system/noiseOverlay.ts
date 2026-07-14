import { safeGetItem, safeSetItem } from '../lib/safeStorage';

const NOISE_KEY = 'noise-overlay-enabled';
const NOISE_CHANGE_EVENT = 'noise-overlay-change';

export function getNoiseEnabled(): boolean {
  return safeGetItem(NOISE_KEY) === '1';
}

export function setNoiseEnabled(enabled: boolean): void {
  safeSetItem(NOISE_KEY, enabled ? '1' : '0');
  window.dispatchEvent(new Event(NOISE_CHANGE_EVENT));
}

export function subscribeNoiseEnabled(callback: () => void): () => void {
  window.addEventListener(NOISE_CHANGE_EVENT, callback);
  return () => window.removeEventListener(NOISE_CHANGE_EVENT, callback);
}
