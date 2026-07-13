import React from 'react';
import { getNoiseEnabled, subscribeNoiseEnabled } from '../design-system/noiseOverlay';

interface NoiseOverlayProps {
  /** Overrides the default fixed/viewport-covering position — used to scope
   *  the texture to a specific surface (e.g. a BottomSheet panel) instead of
   *  the whole page. */
  style?: React.CSSProperties;
}

export function NoiseOverlay({ style }: NoiseOverlayProps = {}) {
  const [enabled, setEnabled] = React.useState(() => getNoiseEnabled());

  React.useEffect(() => subscribeNoiseEnabled(() => setEnabled(getNoiseEnabled())), []);

  if (!enabled) return null;

  return <div className="app-noise-overlay" style={style} />;
}
