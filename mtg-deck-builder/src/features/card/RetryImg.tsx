import React from 'react';
import { useRetryingImage } from './cardImageFallback';

interface RetryImgProps {
  src: string | null | undefined;
  alt?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  /** Rendered when the image (and all its size fallbacks/retries) fail — e.g. a
   *  neutral block or an icon, so users never see the browser's broken-image
   *  glyph. Defaults to nothing. */
  fallback?: React.ReactNode;
}

/** Thin <img> wrapper that survives Scryfall CDN hiccups: retries + size
 *  fallback (see useRetryingImage), then renders `fallback` instead of a
 *  broken image. For raw card-art <img>s that aren't full CardImage frames. */
export function RetryImg({ src, alt, style, draggable, fallback = null }: RetryImgProps) {
  const img = useRetryingImage(src);
  if (img.failed) return <>{fallback}</>;
  return (
    <img
      src={img.src}
      alt={alt ?? ''}
      draggable={draggable}
      onLoad={img.onLoad}
      onError={img.onError}
      style={style}
    />
  );
}
