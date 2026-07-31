import { safeGetItem, safeSetItem } from '../lib/safeStorage';

export interface AccentPreset {
  id: string;
  label: string;
  accent: string;
}

// Candidates for replacing the current gold/amber accent, chosen to read as
// distinct from the two most common choices for this kind of product
// (purple and yellow/gold). Every hex here holds at least a 4.5:1 contrast
// ratio against #0f0f0f (the base background AND the text color used on top
// of a solid accent button) — the WCAG AA threshold for normal text — so
// swapping the accent in doesn't quietly break legibility.
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'orange', label: 'Laranja', accent: '#F1AB78' },
  { id: 'orange-pastel', label: 'Marrom pastel', accent: '#DBB295' },
  { id: 'emerald', label: 'Verde esmeralda', accent: '#2FAE79' },
  { id: 'yellow-pastel', label: 'Amarelo pastel', accent: '#F0D98C' },
  { id: 'lilac', label: 'Lilás', accent: '#CE9CCE' },
  { id: 'lilac-bright', label: 'Lilás aceso', accent: '#D584E0' },
];

/** Matches the --accent default hard-coded in index.css. */
export const DEFAULT_ACCENT = '#F0D98C';

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

/** Whites the Tutor button's mesh tones are mixed into. Three of them —
 *  warm, cool and neutral — because blending the same accent into different
 *  whites gives the blobs a slight hue difference, which is what makes the
 *  result read as a mesh rather than one flat colour at different
 *  brightnesses. */
const MESH_WHITE_WARM: [number, number, number] = [255, 248, 238];
const MESH_WHITE_COOL: [number, number, number] = [240, 246, 255];
const MESH_WHITE_NEUTRAL: [number, number, number] = [253, 253, 253];
/** Near-black behind the icon's ink, so the stroke stays a very dark version
 *  of the accent instead of going flat black. */
const MESH_INK_BASE: [number, number, number] = [10, 9, 12];

/** Blends `amount` of the accent into `base`. */
function blend(hex: string, amount: number, base: [number, number, number]): string {
  const [r, g, b] = hexToRgb(hex);
  return `#${toHex(base[0] + (r - base[0]) * amount)}${toHex(
    base[1] + (g - base[1]) * amount
  )}${toHex(base[2] + (b - base[2]) * amount)}`;
}

/** Sets the --accent-* CSS custom properties from a single base hex,
 *  mirroring the ratios of the original hand-picked gold values. */
export function applyAccent(hex: string) {
  const root = document.documentElement.style;
  root.setProperty('--accent', hex);
  root.setProperty('--accent-hover', lighten(hex, 0.15));
  root.setProperty('--accent-subtle', rgba(hex, 0.12));
  root.setProperty('--accent-border', rgba(hex, 0.3));
  // Tutor button: a pale mesh with the icon drawn in a very dark accent.
  // The spread is wide (0.08 → 0.80 of the accent) so the blobs actually read
  // as a mesh at 52px, and the ink holds >=5.3:1 against the most saturated
  // tone for every preset in ACCENT_PRESETS.
  root.setProperty('--accent-mesh-base', blend(hex, 0.25, MESH_WHITE_WARM));
  // Deepest point: the accent taken slightly past itself. Pushing this and
  // mesh-2 apart is what gives the gradient its range (1.76:1 between the
  // two ends, vs 1.28:1 when this was the raw accent).
  root.setProperty('--accent-mesh-1', blend(hex, 0.85, MESH_INK_BASE));
  root.setProperty('--accent-mesh-2', blend(hex, 0.02, MESH_WHITE_COOL));
  root.setProperty('--accent-mesh-3', blend(hex, 0.45, MESH_WHITE_NEUTRAL));
  // Darkened to pay for the deeper mesh — the icon still clears 4.8:1
  // against the deepest point on every preset.
  root.setProperty('--accent-mesh-ink', blend(hex, 0.09, MESH_INK_BASE));
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function saveAccentPreview(hex: string) {
  safeSetItem(STORAGE_KEY, hex);
}

export function getSavedAccentPreview(): string | null {
  const saved = safeGetItem(STORAGE_KEY);
  // Guard against corrupted/legacy values — a malformed hex flows through
  // hexToRgb as NaN and paints invalid CSS variables app-wide.
  return saved && HEX_RE.test(saved) ? saved : null;
}

/** Re-applies a previously saved preview on app boot, before first paint,
 *  so testing an accent persists across reloads/navigation without a flash
 *  of the default gold. */
export function loadAccentPreview() {
  const saved = getSavedAccentPreview();
  if (saved) applyAccent(saved);
}
