import React from 'react';
import { WizardHatIcon } from '../../design-system/components/WizardHatIcon';
import { NoiseOverlay } from '../../components/NoiseOverlay';

interface Props {
  onClick: () => void;
  size?: number;
}

/**
 * Entry point to the Tutor. Its face is an animated mesh gradient built from
 * dark tones of the current accent (see --accent-mesh-* in accentPreview),
 * finished with the same film grain the rest of the app uses.
 *
 * The tones stay dark deliberately: the wizard hat on top is white, and the
 * mesh has to keep it legible for every accent the user can pick.
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
        border: '1px solid var(--accent-border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        color: '#ffffff',
      }}
    >
      {/* Drifting mesh (CSS: .tutor-mesh in index.css) */}
      <span className="tutor-mesh" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>

      {/* Same grain as the rest of the app, and it honours the user's
          "texture" preference through NoiseOverlay. */}
      <NoiseOverlay style={{ position: 'absolute', inset: 0, zIndex: 1, borderRadius: '50%' }} />

      <WizardHatIcon size={Math.round(size * 0.35)} style={{ position: 'relative', zIndex: 2 }} />
    </button>
  );
}
