import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const sizeConfig = {
  sm: { height: '32px', fontSize: '13px', padding: '0 10px', iconSize: 14 },
  md: { height: '38px', fontSize: '14px', padding: '0 12px', iconSize: 16 },
  lg: { height: '44px', fontSize: '15px', padding: '0 14px', iconSize: 18 },
};

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  size = 'md',
  fullWidth = true,
  disabled,
  style,
  className,
  id,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const config = sizeConfig[size];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    width: fullWidth ? '100%' : undefined,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    letterSpacing: '0.01em',
  };

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: fullWidth ? '100%' : undefined,
    backgroundColor: 'var(--surface-1)',
    border: `1px solid ${error ? 'var(--error)' : isFocused ? 'var(--border-strong)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-md)',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxShadow: isFocused && !error ? '0 0 0 3px var(--accent-subtle)' : 'none',
    opacity: disabled ? 0.5 : 1,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    height: config.height,
    fontSize: config.fontSize,
    color: 'var(--text-primary)',
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    paddingLeft: leftIcon ? '36px' : config.padding.split(' ')[1],
    paddingRight: rightIcon ? '36px' : config.padding.split(' ')[1],
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
    cursor: disabled ? 'not-allowed' : 'text',
    ...style,
  };

  const iconWrapperStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    [side]: '10px',
    display: 'flex',
    alignItems: 'center',
    color: error ? 'var(--error)' : isFocused ? 'var(--text-secondary)' : 'var(--text-muted)',
    pointerEvents: 'none',
    transition: 'color 0.15s ease',
    fontSize: `${config.iconSize}px`,
  });

  return (
    <div style={containerStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <div style={wrapperStyle}>
        {leftIcon && <span style={iconWrapperStyle('left')}>{leftIcon}</span>}
        <input
          id={inputId}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={inputStyle}
          {...props}
        />
        {rightIcon && <span style={iconWrapperStyle('right')}>{rightIcon}</span>}
      </div>
      {(error || hint) && (
        <span
          style={{
            fontSize: '12px',
            color: error ? 'var(--error)' : 'var(--text-muted)',
            letterSpacing: '0.01em',
          }}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}
