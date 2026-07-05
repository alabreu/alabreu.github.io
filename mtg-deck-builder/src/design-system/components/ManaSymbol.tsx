import React from 'react';
import { ManaColor } from '../../types';

interface ManaSymbolProps {
  color: ManaColor;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const fallbackConfig: Record<ManaColor, { bg: string; text: string }> = {
  W: { bg: 'var(--mana-w)', text: '#1a1a1a' },
  U: { bg: 'var(--mana-u)', text: '#ffffff' },
  B: { bg: 'var(--mana-b)', text: '#ffffff' },
  R: { bg: 'var(--mana-r)', text: '#ffffff' },
  G: { bg: 'var(--mana-g)', text: '#ffffff' },
  C: { bg: 'var(--mana-c)', text: '#1a1a1a' },
};

const sizeConfig = {
  sm: 18,
  md: 24,
  lg: 32,
};

export function ManaSymbol({ color, size = 'md', style }: ManaSymbolProps) {
  const diameter = sizeConfig[size];
  const [errored, setErrored] = React.useState(false);

  if (errored) {
    const { bg, text } = fallbackConfig[color];
    return (
      <span
        aria-label={`Mana ${color}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${diameter}px`,
          height: `${diameter}px`,
          borderRadius: '50%',
          backgroundColor: bg,
          color: text,
          fontSize: `${Math.round(diameter * 0.46)}px`,
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          userSelect: 'none',
          ...style,
        }}
      >
        {color}
      </span>
    );
  }

  return (
    <img
      src={`https://svgs.scryfall.io/card-symbols/${color}.svg`}
      alt={`Mana ${color}`}
      draggable={false}
      onError={() => setErrored(true)}
      style={{
        display: 'inline-block',
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: '50%',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        userSelect: 'none',
        ...style,
      }}
    />
  );
}

interface ManaCostProps {
  cost: string;
  size?: 'sm' | 'md' | 'lg';
  gap?: number;
}

/** Renders a full mana cost string like "{2}{W/U}{B}" as Scryfall symbol images. */
export function ManaCost({ cost, size = 'sm', gap = 3 }: ManaCostProps) {
  const diameter = sizeConfig[size];
  const tokens = cost.match(/\{[^}]+\}/g) ?? [];
  if (tokens.length === 0) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px`, flexWrap: 'wrap' }}>
      {tokens.map((token, i) => {
        const symbol = token.slice(1, -1).replace('/', '').toUpperCase();
        return (
          <img
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${encodeURIComponent(symbol)}.svg`}
            alt={token}
            draggable={false}
            style={{
              display: 'inline-block',
              width: `${diameter}px`,
              height: `${diameter}px`,
              borderRadius: '50%',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
              userSelect: 'none',
            }}
          />
        );
      })}
    </span>
  );
}

interface ManaGroupProps {
  colors: ManaColor[];
  size?: 'sm' | 'md' | 'lg';
  gap?: number;
}

export function ManaGroup({ colors, size = 'sm', gap = 2 }: ManaGroupProps) {
  if (!colors || colors.length === 0) {
    return (
      <ManaSymbol color="C" size={size} />
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px` }}>
      {colors.map((color) => (
        <ManaSymbol key={color} color={color} size={size} />
      ))}
    </span>
  );
}
