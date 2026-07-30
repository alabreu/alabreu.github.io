import React from 'react';
import { Skeleton } from '../../design-system/components/Skeleton';
import { useRetryingImage } from './cardImageFallback';

interface CardImageProps {
  imageUrl: string | null;
  name: string;
  size?: 'small' | 'normal' | 'large';
  style?: React.CSSProperties;
  onClick?: () => void;
  showQuantityBadge?: number;
  /** Highlights the card with a yellow ring, e.g. to flag it's already in the deck. */
  highlightInDeck?: boolean;
  /** Highlights the card with a red ring to flag a deck-validation error. Takes precedence over highlightInDeck. */
  highlightError?: boolean;
}

const aspectRatio = 63 / 88; // standard MTG card ratio

export function CardImage({
  imageUrl,
  name,
  size = 'normal',
  style,
  onClick,
  showQuantityBadge,
  highlightInDeck,
  highlightError,
}: CardImageProps) {
  // Resilient image: retries a transient Scryfall CDN miss and falls back
  // across size buckets before giving up to the placeholder below. State reset
  // on URL change is handled inside the hook.
  const { src, loaded, failed, onLoad, onError } = useRetryingImage(imageUrl);
  // An image that finished decoding BEFORE React attached the load handler
  // (warm HTTP cache, data: URI) never fires `load`, leaving the <img> stuck
  // at opacity 0 — a blank card. Check the element directly on mount/src change.
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  React.useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) onLoad();
  }, [src, onLoad]);
  // "Already in deck" reads as a success state, not a brand/accent one — it
  // shouldn't shift color every time someone tweaks the accent (see the
  // Design System accent picker).
  const ringColor = highlightError ? 'var(--error)' : highlightInDeck ? 'var(--success)' : null;

  if (!imageUrl || failed) {
    return (
      <div
        onClick={onClick}
        style={{
          width: '100%',
          aspectRatio: `${aspectRatio}`,
          backgroundColor: 'var(--surface-2)',
          border: ringColor ? `2px solid ${ringColor}` : '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px',
          cursor: onClick ? 'pointer' : undefined,
          ...style,
        }}
      >
        <span style={{ fontSize: '28px' }}>🃏</span>
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {name}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${aspectRatio}`,
        borderRadius: '4.8%',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {!loaded && (
        <Skeleton
          width="100%"
          height="100%"
          borderRadius="var(--radius-md)"
          style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={name}
        onLoad={onLoad}
        onError={onError}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          borderRadius: '4.8%',
          boxShadow: 'var(--shadow-md)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
      {ringColor && (
        // A real bordered overlay, not a box-shadow: an inset box-shadow on
        // the <img> itself paints underneath the replaced image content in
        // Chromium and is invisible against an opaque image.
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '4.8%',
            border: `2px solid ${ringColor}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
      {showQuantityBadge !== undefined && showQuantityBadge > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            backgroundColor: 'var(--accent)',
            color: '#0f0f0f',
            borderRadius: 'var(--radius-full)',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
            zIndex: 2,
          }}
        >
          {showQuantityBadge}
        </div>
      )}
    </div>
  );
}
