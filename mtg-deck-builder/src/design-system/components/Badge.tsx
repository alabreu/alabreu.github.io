import React from 'react';

type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'mana-w'
  | 'mana-u'
  | 'mana-b'
  | 'mana-r'
  | 'mana-g'
  | 'mana-c';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--surface-3)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-default)',
  },
  accent: {
    backgroundColor: 'var(--accent-subtle)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-border)',
  },
  success: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    color: 'var(--success)',
    border: '1px solid rgba(74, 222, 128, 0.25)',
  },
  warning: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    color: 'var(--warning)',
    border: '1px solid rgba(251, 191, 36, 0.25)',
  },
  error: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    color: 'var(--error)',
    border: '1px solid rgba(248, 113, 113, 0.25)',
  },
  'mana-w': {
    backgroundColor: 'var(--mana-w)',
    color: '#1a1a1a',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  'mana-u': {
    backgroundColor: 'var(--mana-u)',
    color: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  'mana-b': {
    backgroundColor: 'var(--mana-b)',
    color: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  'mana-r': {
    backgroundColor: 'var(--mana-r)',
    color: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  'mana-g': {
    backgroundColor: 'var(--mana-g)',
    color: '#fff',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  'mana-c': {
    backgroundColor: 'var(--mana-c)',
    color: '#1a1a1a',
    border: '1px solid rgba(0,0,0,0.1)',
  },
};

const sizeStyles = {
  sm: {
    padding: '2px 7px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: 'var(--radius-full)',
    lineHeight: '18px',
  },
  md: {
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: 'var(--radius-full)',
    lineHeight: '20px',
  },
};

export function Badge({ variant = 'default', children, size = 'sm', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
