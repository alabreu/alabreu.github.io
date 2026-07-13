const FLAME_TINT_KEY = 'flame-tint-enabled';
const FLAME_TINT_CHANGE_EVENT = 'flame-tint-change';

export function getFlameTintEnabled(): boolean {
  return localStorage.getItem(FLAME_TINT_KEY) === '1';
}

/** Sets the 4 --mesh-blob-* custom properties as color-mix() expressions
 *  referencing var(--accent) — since they reference the variable rather
 *  than a computed hex, the flame blur stays in sync automatically
 *  whenever the accent changes later, with no extra listener needed.
 *  Clearing them lets the hard-coded ember fallback in index.css show
 *  through again. */
export function applyFlameTint(enabled: boolean) {
  const root = document.documentElement.style;
  if (enabled) {
    root.setProperty('--mesh-blob-1', 'color-mix(in oklch, var(--accent) 55%, black 45%)');
    root.setProperty('--mesh-blob-2', 'var(--accent)');
    root.setProperty('--mesh-blob-3', 'color-mix(in oklch, var(--accent) 40%, #545456 60%)');
    root.setProperty('--mesh-blob-4', 'color-mix(in oklch, var(--accent) 30%, black 70%)');
  } else {
    root.removeProperty('--mesh-blob-1');
    root.removeProperty('--mesh-blob-2');
    root.removeProperty('--mesh-blob-3');
    root.removeProperty('--mesh-blob-4');
  }
}

export function setFlameTintEnabled(enabled: boolean): void {
  localStorage.setItem(FLAME_TINT_KEY, enabled ? '1' : '0');
  applyFlameTint(enabled);
  window.dispatchEvent(new Event(FLAME_TINT_CHANGE_EVENT));
}

export function subscribeFlameTintEnabled(callback: () => void): () => void {
  window.addEventListener(FLAME_TINT_CHANGE_EVENT, callback);
  return () => window.removeEventListener(FLAME_TINT_CHANGE_EVENT, callback);
}

/** Re-applies a saved flame-tint preference before first paint, mirroring
 *  loadAccentPreview(). */
export function loadFlameTint() {
  if (getFlameTintEnabled()) applyFlameTint(true);
}
