import React from 'react';

// Scryfall serves card images from an R2 CDN (cards.scryfall.io) that has had
// intermittent cache misses — an image URL that exists can transiently fail to
// load. This module makes any card <img> resilient: it retries a failed URL
// (cache-busted) a couple of times, then falls back to the SAME card image in a
// different size bucket (a separate R2 object that may still be cached), and
// only gives up to a placeholder once every option is exhausted.

const SCRYFALL_SIZE_RE = /\/(small|normal|large)\//;
const SIZE_ORDER: Record<string, string[]> = {
  small: ['small', 'normal', 'large'],
  normal: ['normal', 'large', 'small'],
  large: ['large', 'normal', 'small'],
};

/** From one Scryfall image URL, ordered candidates across the other size
 *  buckets (same art, different rendition). Non-Scryfall / non-sized URLs
 *  (art_crop, edhrec favicon, …) return just the original. */
export function imageCandidates(url: string | null | undefined): string[] {
  if (!url) return [];
  const m = url.match(SCRYFALL_SIZE_RE);
  if (!m) return [url];
  const sizes = SIZE_ORDER[m[1]] ?? [m[1]];
  return sizes.map((s) => url.replace(SCRYFALL_SIZE_RE, `/${s}/`));
}

function withRetryParam(url: string, n: number): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}rtry=${n}`;
}

export interface RetryingImage {
  src: string | undefined;
  loaded: boolean;
  failed: boolean;
  onLoad: () => void;
  onError: () => void;
}

/** Drives a resilient <img>: returns the current `src` plus onLoad/onError
 *  handlers that walk retries → size fallbacks → `failed`. One retry per size
 *  keeps request volume bounded even during a full CDN outage. */
export function useRetryingImage(
  primary: string | null | undefined,
  retriesPerUrl = 1
): RetryingImage {
  const candidates = React.useMemo(() => imageCandidates(primary), [primary]);
  const [idx, setIdx] = React.useState(0);
  const [attempt, setAttempt] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(candidates.length === 0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setIdx(0);
    setAttempt(0);
    setLoaded(false);
    setFailed(candidates.length === 0);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [candidates]);

  const base = candidates[idx];
  const src = base ? (attempt === 0 ? base : withRetryParam(base, attempt)) : undefined;

  const onLoad = React.useCallback(() => setLoaded(true), []);

  const onError = React.useCallback(() => {
    setLoaded(false);
    if (attempt < retriesPerUrl) {
      // Transient miss — retry the same object shortly, cache-busted.
      timer.current = setTimeout(() => setAttempt((a) => a + 1), 500 * (attempt + 1));
      return;
    }
    if (idx < candidates.length - 1) {
      setIdx((i) => i + 1);
      setAttempt(0);
      return;
    }
    setFailed(true);
  }, [attempt, idx, candidates.length, retriesPerUrl]);

  return { src, loaded, failed, onLoad, onError };
}
