export interface AccentPreset {
  id: string;
  label: string;
  accent: string;
}

// Candidates for replacing the current gold/amber accent, chosen to read as
// distinct from the two most common choices for this kind of product
// (purple and yellow/gold).
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'orange', label: 'Laranja', accent: '#E8823A' },
  { id: 'neon-green', label: 'Verde neon', accent: '#4AFA3C' },
  { id: 'pastel-brown', label: 'Marrom pastel', accent: '#B98B6A' },
  { id: 'coral-pink', label: 'Rosa avermelhado', accent: '#EA6472' },
  { id: 'petrol-blue', label: 'Azul petróleo', accent: '#3B8FA3' },
  { id: 'emerald', label: 'Verde esmeralda', accent: '#2FAE79' },
  { id: 'terracotta', label: 'Terracota', accent: '#C1613F' },
  { id: 'turquoise', label: 'Turquesa', accent: '#2FBFB0' },
];

const STORAGE_KEY = 'accent-preview';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `#${toHex(r + (255 - r) * amount)}${toHex(g + (255 - g) * amount)}${toHex(b + (255 - b) * amount)}`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Sets the four --accent-* CSS custom properties from a single base hex,
 *  mirroring the ratios of the original hand-picked gold values. */
export function applyAccent(hex: string) {
  const root = document.documentElement.style;
  root.setProperty('--accent', hex);
  root.setProperty('--accent-hover', lighten(hex, 0.15));
  root.setProperty('--accent-subtle', rgba(hex, 0.12));
  root.setProperty('--accent-border', rgba(hex, 0.3));
}

export function saveAccentPreview(hex: string) {
  localStorage.setItem(STORAGE_KEY, hex);
}

export function clearAccentPreview() {
  localStorage.removeItem(STORAGE_KEY);
  const root = document.documentElement.style;
  root.removeProperty('--accent');
  root.removeProperty('--accent-hover');
  root.removeProperty('--accent-subtle');
  root.removeProperty('--accent-border');
}

export function getSavedAccentPreview(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Re-applies a previously saved preview on app boot, before first paint,
 *  so testing an accent persists across reloads/navigation without a flash
 *  of the default gold. */
export function loadAccentPreview() {
  const saved = getSavedAccentPreview();
  if (saved) applyAccent(saved);
}
