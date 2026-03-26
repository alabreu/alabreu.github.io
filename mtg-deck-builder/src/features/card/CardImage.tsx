import React from 'react';
import { Skeleton } from '../../design-system/components/Skeleton';

interface CardImageProps {
  imageUrl: string | null;
  name: string;
  size?: 'small' | 'normal' | 'large';
  style?: React.CSSProperties;
  onClick?: () => void;
  showQuantityBadge?: number;
}

const aspectRatio = 63 / 88; // standard MTG card ratio

export function CardImage({
  imageUrl,
  name,
  size = 'normal',
  style,
  onClick,
  showQuantityBadge,
}: CardImageProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const widths = { small: 120, normal: 200, large: 280 };
  const width = widths[size];
  const height = Math.round(width / aspectRatio);

  if (!imageUrl || error) {
    return (
      <div
        onClick={onClick}
        style={{
          width: '100%',
          aspectRatio: `${aspectRatio}`,
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
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
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {!loaded && (
        <Skeleton
          width="100%"
          height={`${height}px`}
          borderRadius="var(--radius-md)"
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        />
      )}
      <img
        src={imageUrl}
        alt={name}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: '100%',
          display: 'block',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
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
