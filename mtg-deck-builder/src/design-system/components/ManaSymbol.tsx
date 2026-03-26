import React from 'react';
import { ManaColor } from '../../types';

interface ManaSymbolProps {
  color: ManaColor;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

const colorConfig: Record<
  ManaColor,
  { bg: string; text: string; label: string }
> = {
  W: { bg: 'var(--mana-w)', text: '#1a1a1a', label: 'W' },
  U: { bg: 'var(--mana-u)', text: '#ffffff', label: 'U' },
  B: { bg: 'var(--mana-b)', text: '#ffffff', label: 'B' },
  R: { bg: 'var(--mana-r)', text: '#ffffff', label: 'R' },
  G: { bg: 'var(--mana-g)', text: '#ffffff', label: 'G' },
  C: { bg: 'var(--mana-c)', text: '#1a1a1a', label: 'C' },
};

const sizeConfig = {
  sm: { diameter: 18, fontSize: 9, fontWeight: 700 },
  md: { diameter: 24, fontSize: 11, fontWeight: 700 },
  lg: { diameter: 32, fontSize: 14, fontWeight: 700 },
};

export function ManaSymbol({ color, size = 'md', style }: ManaSymbolProps) {
  const { bg, text, label } = colorConfig[color];
  const { diameter, fontSize, fontWeight } = sizeConfig[size];

  return (
    <span
      aria-label={`Mana ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: '50%',
        backgroundColor: bg,
        color: text,
        fontSize: `${fontSize}px`,
        fontWeight,
        fontFamily: 'inherit',
        lineHeight: 1,
        letterSpacing: 0,
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        userSelect: 'none',
        ...style,
      }}
    >
      {label}
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
