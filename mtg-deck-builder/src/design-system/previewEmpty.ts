// Dev-only preview: force the app's empty states to render even when you have
// real data, so you can review them without deleting decks or making a second
// account. Backed by sessionStorage (NOT localStorage) so it clears when the
// tab closes — you can never accidentally leave it on and think your decks are
// gone. Toggled from the hidden Design System page (/#/design).

const KEY = 'preview-empty';
const EVENT = 'preview-empty-change';

export function getEmptyPreview(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setEmptyPreview(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(KEY, '1');
    else sessionStorage.removeItem(KEY);
  } catch {
    /* sessionStorage unavailable — preview just won't stick */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeEmptyPreview(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
