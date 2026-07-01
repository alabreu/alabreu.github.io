import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronRight, User, Palette, ChevronRight as MenuArrow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeckStore } from '../store/useDeckStore';
import { Deck } from '../types';
import { Button } from '../design-system/components/Button';
import { BottomSheet } from '../design-system/components/BottomSheet';
import { ManaGroup } from '../design-system/components/ManaSymbol';
import { Badge } from '../design-system/components/Badge';

function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = React.useState(false);
  const totalCards = deck.cards.reduce((s, c) => s + c.quantity, 0);

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-elevated)',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => navigate(`/deck/${deck.id}`)}
    >
      {/* Background art */}
      {deck.commanderArtUrl ? (
        <>
          <img
            src={deck.commanderArtUrl}
            alt={deck.commanderName ?? ''}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.9) 100%)',
            }}
          />
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            opacity: 0.3,
          }}
        >
          🃏
        </div>
      )}

      {/* Top actions */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '8px',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDelete(true);
          }}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            opacity: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
          className="deck-delete-btn"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Bottom info */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginTop: 'auto',
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: deck.commanderArtUrl ? '#fff' : 'var(--text-primary)',
              letterSpacing: '-0.02em',
              textShadow: deck.commanderArtUrl ? '0 1px 4px rgba(0,0,0,0.8)' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '8px',
            }}
          >
            {deck.name}
          </h3>
          <ChevronRight
            size={14}
            style={{ color: deck.commanderArtUrl ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)', flexShrink: 0 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <ManaGroup
            colors={deck.colorIdentity.length > 0 ? deck.colorIdentity : ['C']}
            size="sm"
          />
          <span
            style={{
              fontSize: '11px',
              color: deck.commanderArtUrl ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)',
            }}
          >
            {totalCards} cartas
          </span>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
              Excluir "{deck.name}"?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDelete(deck.id);
                  setShowDelete(false);
                }}
              >
                Excluir
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Home() {
  const { decks, deleteDeck } = useDeckStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '0 20px 0',
          paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 20px))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontVariationSettings: "'opsz' 144, 'wght' 800",
                  fontWeight: 800,
                  fontSize: '34px',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  margin: '0 0 5px 0',
                  lineHeight: 1.05,
                }}
              >
                My decks
              </h1>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
              </p>
            </div>

            {/* Avatar button */}
            <button
              onClick={() => setMenuOpen(true)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                flexShrink: 0,
                transition: 'background-color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <User size={18} />
            </button>
          </div>
        </motion.div>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, padding: '0 16px 32px', display: 'flex', flexDirection: 'column' }}>
        {decks.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              padding: '24px',
              textAlign: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                Nenhum deck ainda
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Crie seu primeiro deck Commander e comece a construir sua coleção.
              </p>
            </div>
            <Button
              variant="white"
              size="lg"
              leftIcon={<Plus size={18} />}
              onClick={() => navigate('/new-deck')}
            >
              Criar Primeiro Deck
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Decks grid */}
            <motion.div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
              }}
            >
              <AnimatePresence>
                {decks.map((deck, i) => (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <DeckCard deck={deck} onDelete={deleteDeck} />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* New deck silhouette card */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: decks.length * 0.05 + 0.05 }}
                whileTap={{ scale: 0.97, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                onClick={() => navigate('/new-deck')}
                style={{
                  minHeight: '160px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-default)',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontFamily: 'inherit',
                  padding: 0,
                  transition: 'border-color 0.15s, color 0.15s, background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Plus size={22} strokeWidth={1.5} />
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Novo deck
                </span>
              </motion.button>
            </motion.div>
          </>
        )}
      </main>

      {/* Menu Bottom Sheet */}
      <BottomSheet isOpen={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <div style={{ padding: '8px 0 24px' }}>
          {/* Design System link */}
          <button
            onClick={() => { setMenuOpen(false); navigate('/design'); }}
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
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: 'var(--text-secondary)',
              }}
            >
              <Palette size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                Design System
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '1px 0 0' }}>
                Componentes e tokens visuais
              </p>
            </div>
            <MenuArrow size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>

        </div>
      </BottomSheet>

    </div>
  );
}
