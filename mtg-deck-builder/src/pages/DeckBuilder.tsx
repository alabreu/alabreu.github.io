import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, List, Search, Bot, MoreHorizontal, Trash2 } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { useDeckStore } from '../store/useDeckStore';
import { ManaGroup } from '../design-system/components/ManaSymbol';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { Button } from '../design-system/components/Button';
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
  const { decks, deleteDeck } = useDeckStore();

  const initialTab = Math.min(Number(searchParams.get('tab') ?? '0'), 2);
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [direction, setDirection] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const deck = decks.find((d) => d.id === id);

  function handleTabChange(newTab: number) {
    if (newTab === activeTab) return;
    setDirection(newTab > activeTab ? 1 : -1);
    setActiveTab(newTab);
    setSearchParams({ tab: String(newTab) }, { replace: true });
  }

  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx] }) => {
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

          <button
            onClick={() => setMenuOpen(true)}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
            }}
          >
            <MoreHorizontal size={20} />
          </button>
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
              paddingBottom: 'calc(96px + env(safe-area-inset-bottom))',
            }}
          >
            {activeTab === 0 && <DecklistTab deck={deck} />}
            {activeTab === 1 && <SearchTab deck={deck} />}
            {activeTab === 2 && <CoachTab deck={deck} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating bottom tab bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 'max(16px, calc(env(safe-area-inset-bottom) + 8px))',
          left: '16px',
          right: '16px',
          zIndex: 50,
          borderRadius: '32px',
          backgroundColor: 'rgba(18, 18, 20, 0.92)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          display: 'flex',
          padding: '6px',
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
                gap: '4px',
                padding: '6px 0 8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '56px',
                  height: '32px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: active ? 'var(--accent)' : 'rgba(255,255,255,0.38)',
                  transition: 'color 0.2s',
                }}
              >
                {active && (
                  <motion.div
                    layoutId="floating-tab-highlight"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(212, 175, 55, 0.14)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={19} style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.01em',
                  transition: 'color 0.2s, font-weight 0.2s',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deck actions bottom sheet */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Opções do deck">
        <div style={{ padding: '8px 0 24px' }}>
          <button
            onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              transition: 'background-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <span
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--error)',
              }}
            >
              <Trash2 size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--error)', margin: 0 }}>
                Excluir deck
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Remove permanentemente este deck
              </p>
            </div>
          </button>
        </div>
      </BottomSheet>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px',
                width: '100%',
                maxWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(248, 113, 113, 0.12)',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--error)',
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                  Excluir "{deck.name}"?
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                  Esta ação não pode ser desfeita. O deck e todas as suas cartas serão removidos permanentemente.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" size="md" fullWidth onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  fullWidth
                  onClick={() => {
                    deleteDeck(deck.id);
                    navigate('/');
                  }}
                >
                  Excluir
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
