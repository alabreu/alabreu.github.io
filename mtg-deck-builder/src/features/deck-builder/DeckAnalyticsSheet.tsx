import React from 'react';
import { BottomSheet } from '../../design-system/components/BottomSheet';
import { ManaSymbol } from '../../design-system/components/ManaSymbol';
import { Deck } from '../../types';
import { countedCards } from '../../lib/deckCounting';
import { manaCurve, cardColors, manaSources, cardTypes, loadProducedMana, Slice } from './deckAnalytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  deck: Deck;
}

/** "Estatísticas do deck": mana curve plus color, mana-source and card-type
 *  breakdowns. Opened by tapping the stats bar in the decklist. */
export function DeckAnalyticsSheet({ isOpen, onClose, deck }: Props) {
  const [produced, setProduced] = React.useState<Record<string, string[]>>({});
  const [sourcesState, setSourcesState] = React.useState<'loading' | 'ready' | 'fallback'>('loading');

  // produced_mana isn't stored on deck cards, so fetch it when the sheet opens.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSourcesState('loading');
    loadProducedMana(countedCards(deck))
      .then((p) => { if (!cancelled) { setProduced(p); setSourcesState('ready'); } })
      .catch(() => { if (!cancelled) setSourcesState('fallback'); });
    return () => { cancelled = true; };
  }, [isOpen, deck.cards, deck.excludedCategories]);

  const curve = React.useMemo(() => manaCurve(deck), [deck]);
  const colors = React.useMemo(() => cardColors(deck), [deck]);
  const sources = React.useMemo(() => manaSources(deck, produced), [deck, produced]);
  const types = React.useMemo(() => cardTypes(deck), [deck]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Estatísticas do deck" maxHeight="92dvh">
      <div style={{ padding: '4px 20px 32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <Section title="Curva de mana" subtitle="Cartas que não são terreno, por custo de mana">
          <BarChart data={curve} />
        </Section>
        <Section title="Cores das cartas" subtitle="Pelo custo de mana; terrenos ficam de fora">
          <Donut slices={colors} unit="cartas" />
        </Section>
        <Section
          title="Fontes de mana"
          subtitle={
            sourcesState === 'loading'
              ? 'Carregando dados do Scryfall…'
              : sourcesState === 'fallback'
                ? 'Sem conexão com o Scryfall: contando só os terrenos básicos'
                : 'Cartas que geram cada cor (um terreno duplo conta nas duas)'
          }
        >
          <Donut slices={sources} unit="fontes" />
        </Section>
        <Section title="Tipos de carta" subtitle="Cada carta no seu tipo principal">
          <Donut slices={types} unit="cartas" />
        </Section>
      </div>
    </BottomSheet>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 12px' }}>{subtitle}</p>
      {children}
    </section>
  );
}

const BAR_AREA_H = 120;

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div role="img" aria-label={`Curva de mana: ${data.map((d) => `${d.label}: ${d.value}`).join(', ')}`}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: BAR_AREA_H + 18, borderBottom: '1px solid var(--border-default)' }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <span style={{ fontSize: '11px', color: d.value > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', marginBottom: '3px' }}>
              {d.value}
            </span>
            <div
              title={`Custo ${d.label}: ${d.value} carta${d.value !== 1 ? 's' : ''}`}
              style={{
                width: '100%',
                maxWidth: '28px',
                height: `${(d.value / max) * BAR_AREA_H}px`,
                backgroundColor: 'var(--accent)',
                borderRadius: '4px 4px 0 0',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
        {data.map((d) => (
          <span key={d.label} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const R_OUT = 62;
const R_IN = 40;

function arcPath(a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${p(R_OUT, a0)} A ${R_OUT} ${R_OUT} 0 ${large} 1 ${p(R_OUT, a1)} L ${p(R_IN, a1)} A ${R_IN} ${R_IN} 0 ${large} 0 ${p(R_IN, a0)} Z`;
}

/** Donut with a legend that doubles as the data table. Tapping a slice or a
 *  legend row shows that slice's numbers in the center. */
function Donut({ slices, unit }: { slices: Slice[]; unit: string }) {
  const [active, setActive] = React.useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Nada para mostrar ainda.</p>;
  }

  let angle = 0;
  const arcs = slices.map((s) => {
    const a0 = angle;
    angle += (s.value / total) * Math.PI * 2;
    return { ...s, a0, a1: angle };
  });
  const current = slices.find((s) => s.key === active) ?? null;
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <svg
        viewBox="-66 -66 132 132"
        width={132}
        height={132}
        style={{ flexShrink: 0, overflow: 'visible' }}
        role="img"
        aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}
      >
        {arcs.length === 1 ? (
          <circle r={(R_OUT + R_IN) / 2} fill="none" stroke={arcs[0].color} strokeWidth={R_OUT - R_IN} />
        ) : (
          arcs.map((a) => (
            <path
              key={a.key}
              d={arcPath(a.a0, a.a1)}
              fill={a.color}
              // 2px surface gap between slices
              stroke="var(--bg-elevated)"
              strokeWidth={2}
              opacity={active && active !== a.key ? 0.35 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onClick={() => setActive(active === a.key ? null : a.key)}
            />
          ))
        )}
        <text textAnchor="middle" y={current ? -2 : 4} style={{ fontSize: '18px', fontWeight: 700, fill: 'var(--text-primary)' }}>
          {current ? current.value : total}
        </text>
        <text textAnchor="middle" y={current ? 14 : 18} style={{ fontSize: '10px', fill: 'var(--text-muted)' }}>
          {current ? pct(current.value) : unit}
        </text>
      </svg>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {slices.map((s) => (
          <li key={s.key}>
            <button
              onClick={() => setActive(active === s.key ? null : s.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 6px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: active === s.key ? 'var(--surface-2)' : 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {s.mana ? (
                <ManaSymbol color={s.mana} size="sm" />
              ) : (
                <span style={{ width: '12px', height: '12px', margin: '0 3px', borderRadius: '3px', backgroundColor: s.color, flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.value}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '32px', textAlign: 'right' }}>{pct(s.value)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
