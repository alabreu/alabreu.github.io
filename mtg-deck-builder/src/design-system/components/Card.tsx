import React from 'react';

type CardVariant = 'elevated' | 'overlay';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
  padding?: string | number;
  noPadding?: boolean;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  elevated: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'var(--shadow-sm)',
  },
  overlay: {
    backgroundColor: 'var(--bg-overlay)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-md)',
  },
};

export function Card({
  variant = 'elevated',
  children,
  style,
  className,
  onClick,
  padding,
  noPadding = false,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    padding: noPadding ? 0 : (padding ?? '16px'),
    cursor: onClick ? 'pointer' : undefined,
    transition: onClick ? 'background-color 0.15s ease, border-color 0.15s ease' : undefined,
    ...variantStyles[variant],
    ...style,
  };

  return (
    <div
      style={baseStyle}
      className={className}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
