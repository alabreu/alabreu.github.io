import React from 'react';
import { getNoiseEnabled, subscribeNoiseEnabled } from '../design-system/noiseOverlay';

export function NoiseOverlay() {
  const [enabled, setEnabled] = React.useState(() => getNoiseEnabled());

  React.useEffect(() => subscribeNoiseEnabled(() => setEnabled(getNoiseEnabled())), []);

  if (!enabled) return null;

  return <div className="app-noise-overlay" />;
}
