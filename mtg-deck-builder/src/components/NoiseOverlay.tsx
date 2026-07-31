import React from 'react';
import { getNoiseEnabled, subscribeNoiseEnabled } from '../design-system/noiseOverlay';

interface NoiseOverlayProps {
  /** Overrides the default fixed/viewport-covering position — used to scope
   *  the texture to a specific surface (e.g. a BottomSheet panel) instead of
   *  the whole page. */
  style?: React.CSSProperties;
  /** Extra class, e.g. `app-noise-overlay--ink` for grain over a pale
   *  surface (the default white-on-screen grain vanishes there). */
  className?: string;
}

export function NoiseOverlay({ style, className }: NoiseOverlayProps = {}) {
  const [enabled, setEnabled] = React.useState(() => getNoiseEnabled());

  React.useEffect(() => subscribeNoiseEnabled(() => setEnabled(getNoiseEnabled())), []);

  if (!enabled) return null;

  return <div className={`app-noise-overlay${className ? ` ${className}` : ''}`} style={style} />;
}
