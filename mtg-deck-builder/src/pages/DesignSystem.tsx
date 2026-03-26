import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Zap, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../design-system/components/Button';
import { Badge } from '../design-system/components/Badge';
import { Input } from '../design-system/components/Input';
import { Card } from '../design-system/components/Card';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { ManaSymbol, ManaGroup } from '../design-system/components/ManaSymbol';
import { Skeleton, SkeletonCard, SkeletonText } from '../design-system/components/Skeleton';
import { ManaColor } from '../types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorSwatch({
  cssVar,
  label,
}: {
  cssVar: string;
  label: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div
        style={{
          height: '40px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: `var(${cssVar})`,
          border: '1px solid var(--border-subtle)',
        }}
      />
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
}

export default function DesignSystem() {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: 'max(12px, env(safe-area-inset-top)) 16px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          Design System
        </h1>
        <Badge variant="accent" size="sm" style={{ marginLeft: '4px' }}>
          v0.1
        </Badge>
      </header>

      <main style={{ padding: '24px 16px', maxWidth: '600px', margin: '0 auto' }}>
        {/* ── Colors ── */}
        <Section title="Colors — Backgrounds">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <ColorSwatch cssVar="--bg-base" label="base" />
            <ColorSwatch cssVar="--bg-elevated" label="elevated" />
            <ColorSwatch cssVar="--bg-overlay" label="overlay" />
            <ColorSwatch cssVar="--bg-hover" label="hover" />
          </div>
        </Section>

        <Section title="Colors — Surfaces">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <ColorSwatch cssVar="--surface-1" label="surface-1" />
            <ColorSwatch cssVar="--surface-2" label="surface-2" />
            <ColorSwatch cssVar="--surface-3" label="surface-3" />
          </div>
        </Section>

        <Section title="Colors — Accent & Status">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <ColorSwatch cssVar="--accent" label="accent" />
            <ColorSwatch cssVar="--accent-hover" label="accent-hover" />
            <ColorSwatch cssVar="--success" label="success" />
            <ColorSwatch cssVar="--warning" label="warning" />
          </div>
        </Section>

        <Section title="Colors — Mana">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {(['W', 'U', 'B', 'R', 'G', 'C'] as ManaColor[]).map((c) => (
              <ColorSwatch key={c} cssVar={`--mana-${c.toLowerCase()}`} label={c} />
            ))}
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { size: '28px', weight: 800, label: 'Heading XL', tracking: '-0.04em' },
              { size: '22px', weight: 700, label: 'Heading L', tracking: '-0.03em' },
              { size: '18px', weight: 700, label: 'Heading M', tracking: '-0.02em' },
              { size: '16px', weight: 600, label: 'Heading S', tracking: '-0.02em' },
              { size: '14px', weight: 400, label: 'Body', tracking: '-0.01em' },
              { size: '13px', weight: 400, label: 'Body S', tracking: '-0.01em' },
              { size: '12px', weight: 500, label: 'Label', tracking: '0.01em' },
              { size: '11px', weight: 500, label: 'Caption', tracking: '0.02em' },
              { size: '10px', weight: 700, label: 'Overline', tracking: '0.06em', transform: 'uppercase' },
            ].map((item) => (
              <div
                key={item.label}
                style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}
              >
                <span
                  style={{
                    fontSize: item.size,
                    fontWeight: item.weight,
                    color: 'var(--text-primary)',
                    letterSpacing: item.tracking,
                    textTransform: (item as any).transform,
                    flex: 1,
                  }}
                >
                  {item.label}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {item.size} / {item.weight}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Buttons">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="primary" size="md" leftIcon={<Star size={14} />}>
                Primary
              </Button>
              <Button variant="secondary" size="md">
                Secondary
              </Button>
              <Button variant="ghost" size="md">
                Ghost
              </Button>
              <Button variant="danger" size="md" leftIcon={<AlertTriangle size={14} />}>
                Danger
              </Button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="md">
                Medium
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="primary" size="md" isLoading>
                Loading
              </Button>
              <Button variant="secondary" size="md" disabled>
                Disabled
              </Button>
              <Button variant="primary" size="md" fullWidth>
                Full Width
              </Button>
            </div>
          </div>
        </Section>

        {/* ── Badges ── */}
        <Section title="Badges">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Badge variant="default">Default</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="mana-w">W</Badge>
            <Badge variant="mana-u">U</Badge>
            <Badge variant="mana-b">B</Badge>
            <Badge variant="mana-r">R</Badge>
            <Badge variant="mana-g">G</Badge>
            <Badge variant="mana-c">C</Badge>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            <Badge variant="default" size="md">Default MD</Badge>
            <Badge variant="accent" size="md">Accent MD</Badge>
            <Badge variant="success" size="md">Success MD</Badge>
          </div>
        </Section>

        {/* ── Inputs ── */}
        <Section title="Inputs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label="Default Input"
              placeholder="Placeholder text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              label="With Left Icon"
              placeholder="Search..."
              leftIcon={<Zap size={14} />}
            />
            <Input
              label="With Error"
              placeholder="Invalid value"
              value="bad-value"
              error="This field has an error"
            />
            <Input
              label="With Hint"
              placeholder="Hint example"
              hint="This is a helpful hint"
            />
            <Input
              label="Disabled"
              placeholder="Disabled input"
              disabled
              value="Disabled"
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input placeholder="SM" size="sm" />
              <Input placeholder="MD" size="md" />
              <Input placeholder="LG" size="lg" />
            </div>
          </div>
        </Section>

        {/* ── Mana Symbols ── */}
        <Section title="Mana Symbols">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(['W', 'U', 'B', 'R', 'G', 'C'] as ManaColor[]).map((c) => (
                <ManaSymbol key={c} color={c} size="sm" />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>sm</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(['W', 'U', 'B', 'R', 'G', 'C'] as ManaColor[]).map((c) => (
                <ManaSymbol key={c} color={c} size="md" />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>md</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {(['W', 'U', 'B', 'R', 'G', 'C'] as ManaColor[]).map((c) => (
                <ManaSymbol key={c} color={c} size="lg" />
              ))}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>lg</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <ManaGroup colors={['W', 'U']} size="md" />
              <ManaGroup colors={['B', 'R', 'G']} size="md" />
              <ManaGroup colors={['W', 'U', 'B', 'R', 'G']} size="md" />
              <ManaGroup colors={[]} size="md" />
            </div>
          </div>
        </Section>

        {/* ── Cards ── */}
        <Section title="Card Containers">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Card variant="elevated">
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                Elevated Card
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Default card with subtle border and shadow.
              </p>
            </Card>
            <Card variant="overlay">
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                Overlay Card
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Overlay variant with stronger border and shadow.
              </p>
            </Card>
            <Card variant="elevated" onClick={() => {}}>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                Clickable Card
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Has cursor pointer and keyboard navigation support.
              </p>
            </Card>
          </div>
        </Section>

        {/* ── Skeleton ── */}
        <Section title="Skeleton Loading">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton height="14px" width="60%" />
              <Skeleton height="14px" width="80%" />
              <Skeleton height="14px" width="40%" />
            </div>
            <SkeletonText lines={3} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </Section>

        {/* ── Bottom Sheet ── */}
        <Section title="Bottom Sheet">
          <Button variant="primary" size="md" onClick={() => setSheetOpen(true)}>
            Open Bottom Sheet
          </Button>
          <BottomSheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Bottom Sheet Demo"
          >
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card variant="elevated">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Info size={16} style={{ color: 'var(--accent)', marginTop: '1px', flexShrink: 0 }} />
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    This bottom sheet slides up with spring physics. You can drag it down or tap the
                    backdrop to close it.
                  </p>
                </div>
              </Card>
              <SkeletonText lines={4} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" size="md" fullWidth onClick={() => setSheetOpen(false)}>
                  Confirm
                </Button>
                <Button variant="ghost" size="md" onClick={() => setSheetOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </BottomSheet>
        </Section>

        {/* ── Shadows & Radius ── */}
        <Section title="Shadows">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[
              { label: 'shadow-sm', shadow: 'var(--shadow-sm)' },
              { label: 'shadow-md', shadow: 'var(--shadow-md)' },
              { label: 'shadow-lg', shadow: 'var(--shadow-lg)' },
              { label: 'shadow-xl', shadow: 'var(--shadow-xl)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  height: '60px',
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: item.shadow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ height: '32px' }} />
      </main>
    </div>
  );
}
