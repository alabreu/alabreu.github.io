const FLAME_SPEED_KEY = 'flame-speed-multiplier';
export const DEFAULT_FLAME_SPEED = 1;

export function getFlameSpeed(): number {
  const raw = localStorage.getItem(FLAME_SPEED_KEY);
  const n = raw ? parseFloat(raw) : DEFAULT_FLAME_SPEED;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FLAME_SPEED;
}

/** --mesh-duration-scale multiplies each blob's base animation-duration
 *  (see index.css) — a speed of 2x means half the duration, so this stores
 *  the inverse. */
export function applyFlameSpeed(speed: number) {
  document.documentElement.style.setProperty('--mesh-duration-scale', String(1 / speed));
}

export function setFlameSpeed(speed: number): void {
  localStorage.setItem(FLAME_SPEED_KEY, String(speed));
  applyFlameSpeed(speed);
}

/** Re-applies a saved speed preference before first paint, mirroring
 *  loadAccentPreview()/loadFlameTint(). */
export function loadFlameSpeed() {
  applyFlameSpeed(getFlameSpeed());
}
