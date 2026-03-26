export const tokens = {
  colors: {
    bg: {
      base: 'var(--bg-base)',
      elevated: 'var(--bg-elevated)',
      overlay: 'var(--bg-overlay)',
      hover: 'var(--bg-hover)',
    },
    surface: {
      1: 'var(--surface-1)',
      2: 'var(--surface-2)',
      3: 'var(--surface-3)',
    },
    border: {
      subtle: 'var(--border-subtle)',
      default: 'var(--border-default)',
      strong: 'var(--border-strong)',
    },
    text: {
      primary: 'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      muted: 'var(--text-muted)',
      disabled: 'var(--text-disabled)',
    },
    accent: {
      default: 'var(--accent)',
      hover: 'var(--accent-hover)',
      subtle: 'var(--accent-subtle)',
      border: 'var(--accent-border)',
    },
    status: {
      success: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--error)',
    },
    mana: {
      W: 'var(--mana-w)',
      U: 'var(--mana-u)',
      B: 'var(--mana-b)',
      R: 'var(--mana-r)',
      G: 'var(--mana-g)',
      C: 'var(--mana-c)',
    },
  },
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
  },
} as const;

export type TokenColor = keyof typeof tokens.colors;
