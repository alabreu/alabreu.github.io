import React from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
  className?: string;
  'aria-label'?: string;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--accent)',
    color: '#0f0f0f',
    border: '1px solid transparent',
  },
  secondary: {
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  danger: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    color: 'var(--error)',
    border: '1px solid rgba(248, 113, 113, 0.25)',
  },
};

const variantHoverStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--accent-hover)',
  },
  secondary: {
    backgroundColor: 'var(--surface-3)',
    borderColor: 'var(--border-strong)',
  },
  ghost: {
    backgroundColor: 'var(--bg-hover)',
    color: 'var(--text-primary)',
  },
  danger: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    gap: '4px',
    height: '30px',
    borderRadius: 'var(--radius-md)',
  },
  md: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    gap: '6px',
    height: '36px',
    borderRadius: 'var(--radius-md)',
  },
  lg: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: 600,
    gap: '8px',
    height: '44px',
    borderRadius: 'var(--radius-lg)',
  },
};

const MotionButton = motion.button;

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  onClick,
  type = 'button',
  style,
  className,
  'aria-label': ariaLabel,
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const computedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    lineHeight: 1,
    letterSpacing: '-0.01em',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled || isLoading ? 0.5 : 1,
    fontFamily: 'inherit',
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(isHovered && !disabled && !isLoading ? variantHoverStyles[variant] : {}),
    ...style,
  };

  return (
    <MotionButton
      type={type}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={computedStyle}
      disabled={disabled || isLoading}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      aria-label={ariaLabel}
    >
      {isLoading ? (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : (
        <>
          {leftIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ display: 'flex', alignItems: 'center' }}>{rightIcon}</span>}
        </>
      )}
    </MotionButton>
  );
}
