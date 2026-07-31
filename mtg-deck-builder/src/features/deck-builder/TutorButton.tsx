import React from 'react';
import { WizardHatIcon } from '../../design-system/components/WizardHatIcon';
import { NoiseOverlay } from '../../components/NoiseOverlay';

interface Props {
  onClick: () => void;
  size?: number;
}

/**
 * Entry point to the Tutor. Its face is an animated mesh gradient built from
 * pale tones of the current accent (see --accent-mesh-* in accentPreview),
 * with the wizard hat drawn in a very dark version of that same accent, and
 * film grain on top.
 *
 * A bright disc against the dark bottom bar — it should read as the one
 * warm object down there.
 */
export function TutorButton({ onClick, size = 52 }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Abrir o Tutor"
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        padding: 0,
        backgroundColor: 'var(--accent-mesh-base)',
        // No border: a pale disc already separates itself from the dark bar,
        // and a rim would only muddy the edge.
        border: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        color: 'var(--accent-mesh-ink)',
      }}
    >
      {/* Drifting mesh (CSS: .tutor-mesh in index.css) */}
      <span className="tutor-mesh" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>

      {/* Ink grain — the app's default white grain would be invisible on this
          pale face. Still honours the user's "texture" preference. */}
      <NoiseOverlay
        className="app-noise-overlay--ink"
        style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: '50%' }}
      />

      <WizardHatIcon size={Math.round(size * 0.35)} style={{ position: 'relative', zIndex: 2 }} />
    </button>
  );
}
