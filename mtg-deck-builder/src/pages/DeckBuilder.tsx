import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, List, Search, Bot } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { useDeckStore } from '../store/useDeckStore';
import { ManaGroup } from '../design-system/components/ManaSymbol';
import { DecklistTab } from '../features/deck-builder/DecklistTab';
import { SearchTab } from '../features/deck-builder/SearchTab';
import { CoachTab } from '../features/deck-builder/CoachTab';

const TABS = [
  { label: 'Decklist', icon: List },
  { label: 'Busca', icon: Search },
  { label: 'Coach', icon: Bot },
];

export default function DeckBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { decks } = useDeckStore();

  const initialTab = Math.min(Number(searchParams.get('tab') ?? '0'), 2);
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [direction, setDirection] = React.useState(0);

  const deck = decks.find((d) => d.id === id);

  function handleTabChange(newTab: number) {
    if (newTab === activeTab) return;
    setDirection(newTab > activeTab ? 1 : -1);
    setActiveTab(newTab);
    setSearchParams({ tab: String(newTab) }, { replace: true });
  }

  // Swipe gesture for tab switching
  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], cancel }) => {
      if (!last) return;
      const threshold = 50;
      if (mx < -threshold || vx < -0.5) {
        if (activeTab < TABS.length - 1) handleTabChange(activeTab + 1);
      } else if (mx > threshold || vx > 0.5) {
        if (activeTab > 0) handleTabChange(activeTab - 1);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      threshold: 10,
    }
  );

  if (!deck) {
    return (
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '36px' }}>🃏</span>
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Deck não encontrado</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Este deck pode ter sido excluído.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            backgroundColor: 'var(--accent)',
            color: '#0f0f0f',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          backgroundColor: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0 16px 12px',
          }}
        >
          <button
            onClick={() => navigate('/')}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={20} />
          </button>

          {/* Commander art thumbnail */}
          {deck.commanderArtUrl && (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-default)',
                flexShrink: 0,
              }}
            >
              <img
                src={deck.commanderArtUrl}
                alt={deck.commanderName ?? ''}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
              />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {deck.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <ManaGroup
                colors={deck.colorIdentity.length > 0 ? deck.colorIdentity : ['C']}
                size="sm"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {totalCards} cartas
              </span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const active = activeTab === i;
            return (
              <button
                key={tab.label}
                onClick={() => handleTabChange(i)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  padding: '10px 0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'inherit',
                  position: 'relative',
                  transition: 'color 0.15s',
                }}
              >
                <Icon size={16} />
                <span style={{ fontSize: '10px', fontWeight: active ? 600 : 400, letterSpacing: '0.02em' }}>
                  {tab.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="tab-indicator"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '20%',
                      right: '20%',
                      height: '2px',
                      backgroundColor: 'var(--accent)',
                      borderRadius: 'var(--radius-full)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Tab content */}
      <div
        {...bind()}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'pan-y',
        }}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={activeTab}
            custom={direction}
            initial={{ x: direction > 0 ? '100%' : '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? '-30%' : '30%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35, mass: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {activeTab === 0 && <DecklistTab deck={deck} />}
            {activeTab === 1 && <SearchTab deck={deck} />}
            {activeTab === 2 && <CoachTab deck={deck} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
