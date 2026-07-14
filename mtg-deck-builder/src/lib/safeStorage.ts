// Thin wrapper around localStorage that never throws. Some environments
// (Safari private mode, cookies/storage disabled, quota exceeded) throw on
// localStorage access; an unguarded read at module-load time would crash the
// whole app before React even mounts (blank white screen). All persistence in
// the app should go through this helper.

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or quota exceeded — best-effort, ignore */
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
