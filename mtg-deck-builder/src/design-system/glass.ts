import type React from 'react';

/**
 * The floating chrome (back, menu, search pill, collapse, bulk bar) shares one
 * glass recipe so it reads as a single material.
 *
 * These surfaces already carried a backdrop blur, but their fills sat at
 * 0.78–0.92 alpha, which is opaque enough that the blur never showed. The
 * tint here is low so the content behind actually comes through; `saturate`
 * keeps that content from going grey the way a plain blur leaves it.
 */
/**
 * 0.68 is a measured floor, not a taste call: the decklist can put near-white
 * card art directly behind these surfaces, and a thinner tint lets that
 * through until the quiet 35%-white placeholder drops to ~1.9:1. At 0.68 —
 * paired with the stronger GLASS_LABEL below — the worst case lands at
 * 3.4:1, slightly better than the opaque design it replaces.
 */
export const GLASS_TINT = 'rgba(18, 18, 20, 0.68)';
const GLASS_FILTER = 'blur(24px) saturate(180%)';

/** Quiet text/icons on glass. Brighter than the 35% white used when these
 *  surfaces were opaque, to pay for what the transparency gives up. */
export const GLASS_LABEL = 'rgba(255,255,255,0.55)';

export const glassSurface: React.CSSProperties = {
  backgroundColor: GLASS_TINT,
  backdropFilter: GLASS_FILTER,
  WebkitBackdropFilter: GLASS_FILTER,
  border: '1px solid rgba(255,255,255,0.10)',
};

/** Depth for the pieces that float over the decklist. */
export const GLASS_SHADOW =
  '0 8px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)';
